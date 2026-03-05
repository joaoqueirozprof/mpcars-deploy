from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # Should be in environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str
    expires_in: int


class TokenData(BaseModel):
    """Token data schema."""
    email: Optional[str] = None
    user_id: Optional[int] = None


class UserToken(BaseModel):
    """User information from token."""
    email: str
    user_id: int
    is_admin: bool


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: The plain text password to hash

    Returns:
        The hashed password
    """
    return pwd_context.hash(password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing token claims
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def verify_token(token: str) -> TokenData:
    """
    Verify and decode a JWT token.

    Args:
        token: The JWT token to verify

    Returns:
        TokenData with decoded information

    Raises:
        HTTPException if token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        user_id: int = payload.get("user_id")

        if email is None or user_id is None:
            raise credentials_exception

        token_data = TokenData(email=email, user_id=user_id)

    except JWTError:
        raise credentials_exception

    return token_data


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    """
    Dependency to get the current authenticated user from token.

    Args:
        token: The JWT token from the authorization header

    Returns:
        TokenData with user information

    Raises:
        HTTPException if token is invalid
    """
    return verify_token(token)


async def get_current_admin_user(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """
    Dependency to verify current user is an admin.

    Args:
        current_user: The current authenticated user

    Returns:
        TokenData if user is admin

    Raises:
        HTTPException if user is not admin
    """
    # Note: is_admin would need to be stored in the token or retrieved from database
    # This is a placeholder for admin verification
    return current_user
