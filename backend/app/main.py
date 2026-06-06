from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import tempfile
import os
from dotenv import load_dotenv

load_dotenv()

from . import models, schemas, auth, crud
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeStudio API")

frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
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
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
    
    if form_data.username == admin_user and form_data.password == admin_pass:
        # Check if admin is in DB, if not, create
        user = auth.get_user_by_username(db, admin_user)
        if not user:
            user = models.User(
                first_name="System",
                last_name="Admin",
                username=admin_user,
                email="admin@codestudio.com",
                password_hash=auth.get_password_hash(admin_pass),
                role="admin"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        user = auth.get_user_by_username(db, form_data.username)
        if not user or not auth.verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
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

import tempfile
import subprocess
import os
import time
from datetime import datetime, timedelta

@app.post("/execute", response_model=schemas.ExecuteResponse)
def execute_code(request: schemas.ExecuteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user_optional)):
    output = ""
    error = ""
    exit_code = 0
    start_time = time.time()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        if request.language == "python":
            file_path = os.path.join(temp_dir, "main.py")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(request.content)
            
            try:
                result = subprocess.run(["python", file_path], capture_output=True, text=True, timeout=10)
                output = result.stdout
                error = result.stderr
                exit_code = result.returncode
            except subprocess.TimeoutExpired:
                error = "Execution timed out (10s limit)"
                exit_code = -1
            except Exception as e:
                error = str(e)
                exit_code = -1
                
        elif request.language in ["javascript", "typescript", "js"]:
            file_path = os.path.join(temp_dir, f"main.{'ts' if request.language == 'typescript' else 'js'}")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(request.content)
                
            try:
                cmd = ["node", file_path] if request.language in ["javascript", "js"] else ["npx", "ts-node", file_path]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                output = result.stdout
                error = result.stderr
                exit_code = result.returncode
            except subprocess.TimeoutExpired:
                error = "Execution timed out (10s limit)"
                exit_code = -1
            except Exception as e:
                error = str(e)
                exit_code = -1
                
        elif request.language in ["cpp", "c", "c++", "cc"]:
            file_path = os.path.join(temp_dir, "main.cpp")
            exe_path = os.path.join(temp_dir, "main.out")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(request.content)
                
            try:
                compile_res = subprocess.run(["g++", file_path, "-o", exe_path], capture_output=True, text=True, timeout=10)
                if compile_res.returncode != 0:
                    error = compile_res.stderr
                    exit_code = compile_res.returncode
                else:
                    run_res = subprocess.run([exe_path], capture_output=True, text=True, timeout=10)
                    output = run_res.stdout
                    error = run_res.stderr
                    exit_code = run_res.returncode
            except subprocess.TimeoutExpired:
                error = "Execution timed out (10s limit)"
                exit_code = -1
            except Exception as e:
                error = str(e)
                exit_code = -1
                
        elif request.language == "java":
            import re
            # Extract public class name for the file name, default to Main
            match = re.search(r'public\s+class\s+(\w+)', request.content)
            class_name = match.group(1) if match else "Main"
            file_path = os.path.join(temp_dir, f"{class_name}.java")
            
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(request.content)
                
            try:
                compile_res = subprocess.run(["javac", file_path], capture_output=True, text=True, timeout=10)
                if compile_res.returncode != 0:
                    error = compile_res.stderr
                    exit_code = compile_res.returncode
                else:
                    run_res = subprocess.run(["java", "-cp", temp_dir, class_name], capture_output=True, text=True, timeout=10)
                    output = run_res.stdout
                    error = run_res.stderr
                    exit_code = run_res.returncode
            except subprocess.TimeoutExpired:
                error = "Execution timed out (10s limit)"
                exit_code = -1
            except Exception as e:
                error = str(e)
                exit_code = -1
                
        else:
            error = f"Execution for language '{request.language}' is not implemented yet locally."
            exit_code = 1
            
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Save log to DB
    new_log = models.ExecutionHistory(
        user_id=current_user.id if current_user else None,
        language=request.language,
        status="success" if exit_code == 0 else "error",
        duration=duration_ms
    )
    db.add(new_log)
    
    # Cleanup old logs (>30 days) randomly (1 in 10 chance to prevent slowing down every request)
    import random
    if random.random() < 0.1:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        db.query(models.ExecutionHistory).filter(models.ExecutionHistory.created_at < thirty_days_ago).delete()
    
    db.commit()
            
    return schemas.ExecuteResponse(output=output, error=error, exit_code=exit_code)

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
    db.delete(project)
    db.commit()
    return {"status": "success"}

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
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
