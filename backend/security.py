"""Security helpers: passlib/bcrypt password hashing + JWT issuing/verification.

JWT payload per spec:
    { "sub": <user_id>, "user_id": <user_id>, "email": ..., "role": "student"|"faculty", "name": ... }
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt

# bcrypt backend — passlib's bundled passlib 1.7.4 warns on bcrypt>=4.1, so we
# call bcrypt directly (same algorithm, no deprecation noise).
import bcrypt

SECRET_KEY = os.getenv("ATOOL_SECRET_KEY", "dev-secret-change-me-before-deploying")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(
    subject: str | int,
    extra: Optional[dict[str, Any]] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Raises jwt.PyJWTError if the token is invalid or expired."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def user_token_claims(user) -> dict[str, Any]:
    """Standard claims embedded in every ATOOL JWT: user_id, email, role, name."""
    role = user.role
    return {
        "user_id": user.id,
        "email": user.email,
        "role": role.value if hasattr(role, "value") else str(role),
        "name": user.name,
    }
