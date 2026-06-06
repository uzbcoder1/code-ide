from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import tempfile
import os

from . import models, schemas, auth, crud
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeStudio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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

@app.post("/execute", response_model=schemas.ExecuteResponse)
def execute_code(request: schemas.ExecuteRequest):
    output = ""
    error = ""
    exit_code = 0
    
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
                # Assuming node is installed
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
                
        else:
            error = f"Execution for language '{request.language}' is not implemented yet locally."
            exit_code = 1
            
    return schemas.ExecuteResponse(output=output, error=error, exit_code=exit_code)

