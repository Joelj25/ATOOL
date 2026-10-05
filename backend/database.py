"""Database configuration for ATOOL.

SQLite is used for rapid local development. To move to PostgreSQL later,
just swap SQLALCHEMY_DATABASE_URL for something like:
    postgresql+psycopg://user:password@localhost:5432/atool
(and `pip install psycopg[binary]`) — every model below stays identical.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./atool.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # check_same_thread=False is required only because SQLite is used with
    # FastAPI's threadpool. Remove it when switching to PostgreSQL.
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""


def get_db():
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
