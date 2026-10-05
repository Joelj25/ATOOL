"""Authentication routes: /auth/login (per spec) + /auth/register and /auth/me.

POST /auth/login verifies credentials and returns a JWT whose payload contains
`user_id`, `email`, `role` ("student" | "faculty") and `name`, plus a user
summary object for the frontend.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import database
import schemas
import security
from deps import get_current_user
from models import Faculty, Role, Student, User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    """Verify password and return JWT + user summary object."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if user is None or not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")

    token = security.create_access_token(subject=str(user.id), extra=security.user_token_claims(user))
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: dict, db: Session = Depends(database.get_db)):
    """Create an account (student by default) and return a JWT immediately."""
    email = str(payload.get("email", "")).lower().strip()
    password = str(payload.get("password", ""))
    name = str(payload.get("name") or "").strip() or email.split("@", 1)[0].title()
    role = Role(payload.get("role", "student"))

    if not email or "@" not in email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A valid email is required.")
    if len(password) < 6:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Password must be at least 6 characters.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    user = User(email=email, password_hash=security.hash_password(password), role=role, name=name)
    db.add(user)
    db.flush()

    if role == Role.student:
        db.add(
            Student(
                user_id=user.id,
                # Auto-generate an enrollment number when none is provided.
                enrollment_no=payload.get("enrollment_no") or f"ENR{date.today().year}{user.id:04d}",
                major=payload.get("major") or "Undeclared",
            )
        )
    elif role == Role.faculty:
        db.add(Faculty(user_id=user.id, department=payload.get("department") or "General"))

    db.commit()
    db.refresh(user)

    token = security.create_access_token(subject=str(user.id), extra=security.user_token_claims(user))
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Return the profile of whoever owns the Bearer token."""
    return schemas.UserOut.model_validate(current_user)
