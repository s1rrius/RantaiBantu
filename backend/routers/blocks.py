from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_current_active_user
from blockchain import validate_chain

router = APIRouter(prefix="/blocks", tags=["blocks"])

@router.get("", response_model=List[schemas.BlockResponse])
def get_blocks(db: Session = Depends(get_db)):
    return db.query(models.Block).order_by(models.Block.index.desc()).all()

@router.get("/validate")
def validate_blocks(db: Session = Depends(get_db)):
    return validate_chain(db)

@router.get("/{index}", response_model=schemas.BlockResponse)
def get_block(index: int, db: Session = Depends(get_db)):
    block = db.query(models.Block).filter(models.Block.index == index).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block
