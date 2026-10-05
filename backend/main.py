"""ATOOL — AI-powered campus operating system. FastAPI entry point.

Run locally with:
    uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import auth
import campus
import chat
import faculty
import student
from database import Base, engine
from seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed realistic demo data on first boot.
    Base.metadata.create_all(bind=engine)
    seed_if_empty()
    yield


app = FastAPI(
    title="ATOOL API",
    description="AI-powered campus operating system — MVP backend",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS: the Next.js frontend runs on localhost:3000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(student.router)
app.include_router(faculty.router)
app.include_router(campus.router)
app.include_router(chat.router)


@app.get("/", tags=["health"])
def root():
    return {"name": "ATOOL API", "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
