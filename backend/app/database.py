from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pathlib import Path

import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'code_studio.db'}")

# If using sqlite, we need check_same_thread
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy deklarativ bazaviy klass (yangi stil)."""
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
