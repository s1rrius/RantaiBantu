from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_current_active_user

router = APIRouter(prefix="/towns", tags=["towns"])

@router.get("", response_model=List[schemas.TownResponse])
def read_towns(db: Session = Depends(get_db)):
    return db.query(models.Town).all()

@router.get("/{town_id}", response_model=schemas.TownResponse)
def read_town(town_id: str, db: Session = Depends(get_db)):
    town = db.query(models.Town).filter(models.Town.id == town_id).first()
    if not town:
        raise HTTPException(status_code=404, detail="Town not found")
    return town
