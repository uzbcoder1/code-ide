from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


def _utcnow():
    """Timezone-aware UTC vaqtini qaytarish."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="student") # admin, teacher, student
    created_at = Column(DateTime, default=_utcnow)

    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, index=True)
    language = Column(String, index=True)
    last_modified = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    owner = relationship("User", back_populates="projects")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    executions = relationship("ExecutionHistory", back_populates="project", cascade="all, delete-orphan")

class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    filename = Column(String, index=True)
    content = Column(Text)

    project = relationship("Project", back_populates="files")

class ExecutionHistory(Base):
    __tablename__ = "execution_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True) # made nullable for guest execution
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    language = Column(String)
    status = Column(String)
    duration = Column(Integer) # in milliseconds
    created_at = Column(DateTime, default=_utcnow)

    project = relationship("Project", back_populates="executions")
    user = relationship("User")

class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    extension = Column(String)
    is_active = Column(Boolean, default=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)
