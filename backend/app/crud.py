from sqlalchemy.orm import Session
from . import models, schemas

def get_projects(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Project).filter(models.Project.user_id == user_id).offset(skip).limit(limit).all()

def create_project(db: Session, title: str, language: str, user_id: int):
    db_project = models.Project(title=title, language=language, user_id=user_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_project(db: Session, project_id: int, user_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == user_id).first()

def delete_project(db: Session, project_id: int, user_id: int):
    db_project = get_project(db, project_id, user_id)
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False

def update_project_file(db: Session, project_id: int, content: str):
    # For now, we assume 1 file per project in the MVP
    db_file = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == project_id).first()
    if not db_file:
        db_file = models.ProjectFile(project_id=project_id, filename="main", content=content)
        db.add(db_file)
    else:
        db_file.content = content
    db.commit()
    db.refresh(db_file)
    
    # Update last modified
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if db_project:
        from datetime import datetime
        db_project.last_modified = datetime.utcnow()
        db.commit()

    return db_file
