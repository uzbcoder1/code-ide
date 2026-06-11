from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: EmailStr

class UserCreate(UserBase):
    """Foydalanuvchi registratsiya schemasi — role fieldi YO'Q (xavfsizlik)."""
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Parol kamida 8 belgidan iborat bo'lishi kerak")
        if not any(c.isdigit() for c in v):
            raise ValueError("Parolda kamida 1 ta raqam bo'lishi kerak")
        if not any(c.isalpha() for c in v):
            raise ValueError("Parolda kamida 1 ta harf bo'lishi kerak")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Username kamida 3 belgidan iborat bo'lishi kerak")
        if len(v) > 30:
            raise ValueError("Username 30 belgidan oshmasligi kerak")
        if not v.isalnum() and "_" not in v:
            raise ValueError("Username faqat harflar, raqamlar va '_' dan iborat bo'lishi kerak")
        return v

class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    username: str
    email: EmailStr
    role: str = "student"
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
    stdin: str = ""

class ExecuteResponse(BaseModel):
    output: str
    error: str = ""
    exit_code: int = 0
