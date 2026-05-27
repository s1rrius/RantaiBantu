from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_password_hash, verify_password, create_access_token, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
import crypto

router = APIRouter()

@router.post("/auth/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    town_id = None
    if user_in.role in [models.RoleEnum.town_representative, models.RoleEnum.citizen]:
        if not user_in.town_name:
            raise HTTPException(status_code=400, detail="Town name required for this role")
        
        town = db.query(models.Town).filter(models.Town.name == user_in.town_name).first()
        if not town:
            town = models.Town(name=user_in.town_name)
            db.add(town)
            db.commit()
            db.refresh(town)
        town_id = town.id

    public_key, private_key = crypto.generate_keypair()

    new_user = models.User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        public_key=public_key,
        private_key_enc=private_key, # Sending it once, normally would be encrypted
        town_id=town_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    # Don't return private key on read me
    current_user.private_key_enc = None 
    return current_user

@router.get("/users", response_model=List[schemas.UserResponse])
def read_users(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role != models.RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    users = db.query(models.User).all()
    for u in users:
        u.private_key_enc = None
    return users
