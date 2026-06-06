from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: EmailStr
    role: str = "student"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ProjectCreate(BaseModel):
    title: str
    language: str

class ProjectUpdateContent(BaseModel):
    content: str

class ProjectResponse(BaseModel):
    id: int
    title: str
    language: str
    last_modified: datetime
    content: str = "" # We will inject the file content here for simplicity

    class Config:
        from_attributes = True

class ExecuteRequest(BaseModel):
    language: str
    content: str

class ExecuteResponse(BaseModel):
    output: str
    error: str = ""
    exit_code: int = 0
