"""Shared FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import database
from models import Role, User
from security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(database.get_db),
) -> User:
    if credentials is None:
        raise UNAUTHORIZED
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise UNAUTHORIZED

    subject = payload.get("sub")
    if subject is None:
        raise UNAUTHORIZED

    user = db.get(User, int(subject))
    if user is None:
        raise UNAUTHORIZED
    return user


def require_role(role: Role):
    """Dependency factory: endpoints guarded by role-based access control."""

    def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires the '{role.value}' role.",
            )
        return user

    return _dependency


require_student = require_role(Role.student)
require_faculty = require_role(Role.faculty)
