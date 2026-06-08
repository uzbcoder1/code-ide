import re
import random
import logging
import time
import tempfile
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request

load_dotenv()

from . import models, schemas, auth, crud
from .database import engine, get_db
from .sandbox import execute_code

# Logging sozlash
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("codestudio")

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeStudio API")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register", response_model=schemas.UserResponse)
@limiter.limit("5/minute")
def register(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = auth.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_email = auth.get_user_by_email(db, email=user.email)
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role="student",  # Role har doim "student" — foydalanuvchi o'zi belgilay olmaydi
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info("Yangi foydalanuvchi ro'yxatdan o'tdi: %s", user.username)
    return new_user

@app.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "Str0ng@Adm1n#2026!")
    
    if admin_pass == "Str0ng@Adm1n#2026!":
        logger.warning("ADMIN_PASSWORD sozlanmagan — default parol ishlatilmoqda. Hostingda environment variable belgilang.")
    
    if form_data.username == admin_user and form_data.password == admin_pass:
        # Admin foydalanuvchini bazadan olish yoki yaratish
        user = auth.get_user_by_username(db, admin_user)
        if not user:
            user = models.User(
                first_name="System",
                last_name="Admin",
                username=admin_user,
                email=os.getenv("ADMIN_EMAIL", "admin@codestudio.com"),
                password_hash=auth.get_password_hash(admin_pass),
                role="admin"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info("Admin foydalanuvchi yaratildi: %s", admin_user)
    else:
        user = auth.get_user_by_username(db, form_data.username)
        if not user or not auth.verify_password(form_data.password, user.password_hash):
            logger.warning("Muvaffaqiyatsiz login urinishi: %s", form_data.username)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    logger.info("Foydalanuvchi tizimga kirdi: %s", user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- Project Endpoints ---

@app.get("/projects", response_model=List[schemas.ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    projects = crud.get_projects(db, user_id=current_user.id)
    # Inject content from files
    for p in projects:
        file = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == p.id).first()
        p.content = file.content if file else ""
    return projects

@app.post("/projects", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_project = crud.create_project(db, title=project.title, language=project.language, user_id=current_user.id)
    # Add an empty file
    crud.update_project_file(db, project_id=db_project.id, content="")
    db_project.content = ""
    return db_project

@app.put("/projects/{project_id}/content")
def update_project_content(project_id: int, request: schemas.ProjectUpdateContent, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_project = crud.get_project(db, project_id, current_user.id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    crud.update_project_file(db, project_id=project_id, content=request.content)
    return {"status": "success"}

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    success = crud.delete_project(db, project_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success"}

@app.post("/execute", response_model=schemas.ExecuteResponse)
@limiter.limit("20/minute")
def execute_code_endpoint(request: Request, payload: schemas.ExecuteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Kodni xavfsiz sandbox muhitida bajarish. Faqat tizimga kirgan foydalanuvchilar uchun."""
    
    logger.info(
        "Kod bajarish so'rovi: til=%s, foydalanuvchi=%s",
        payload.language,
        current_user.username,
    )
    
    # Sandbox orqali kodni bajarish
    result = execute_code(payload.language, payload.content)

    # Natijani bazaga yozish
    new_log = models.ExecutionHistory(
        user_id=current_user.id,
        language=payload.language,
        status="success" if result.exit_code == 0 else "error",
        duration=result.duration_ms,
    )
    db.add(new_log)
    db.commit()
            
    return schemas.ExecuteResponse(output=result.output, error=result.error, exit_code=result.exit_code)

# --- Admin Endpoints ---

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    users_count = db.query(models.User).count()
    projects_count = db.query(models.Project).count()
    logs_count = db.query(models.ExecutionHistory).count()
    return {"users": users_count, "projects": projects_count, "logs": logs_count}

@app.get("/admin/users")
def get_admin_users(db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    users = db.query(models.User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "created_at": u.created_at} for u in users]

@app.get("/admin/logs")
def get_admin_logs(db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    logs = db.query(models.ExecutionHistory).order_by(models.ExecutionHistory.created_at.desc()).limit(100).all()
    result = []
    for log in logs:
        username = "Guest"
        if log.user:
            username = log.user.username
        result.append({
            "id": log.id,
            "username": username,
            "language": log.language,
            "status": log.status,
            "duration": log.duration,
            "created_at": log.created_at
        })
    return result

@app.get("/admin/projects")
def get_admin_projects(db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    projects = db.query(models.Project).all()
    result = []
    for p in projects:
        owner = "Guest"
        if p.owner:
            owner = p.owner.username
        result.append({
            "id": p.id,
            "title": p.title,
            "language": p.language,
            "owner": owner,
            "last_modified": p.last_modified
        })
    return result

@app.delete("/admin/projects/{project_id}")
def delete_admin_project(project_id: int, db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    logger.info("Admin loyihani o'chirdi: id=%d, admin=%s", project_id, current_admin.username)
    db.delete(project)
    db.commit()
    return {"status": "success"}

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

# Serve Frontend SPA
BASE_DIR = Path(__file__).resolve().parent.parent
frontend_dist = os.path.join(BASE_DIR.parent, "frontend", "dist")

if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    # Catch-all route to serve index.html for the SPA
    @app.get("/{catchall:path}")
    def serve_spa(catchall: str):
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend build not found"}
