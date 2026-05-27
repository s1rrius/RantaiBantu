from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_current_active_user

router = APIRouter(prefix="/contracts", tags=["contracts"])

@router.post("", response_model=schemas.ContractResponse)
def create_contract(
    contract_in: schemas.ContractCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != models.RoleEnum.town_representative:
        raise HTTPException(status_code=403, detail="Only town representatives can create contracts")
    
    new_contract = models.Contract(
        name=contract_in.name,
        contract_type=contract_in.contract_type,
        params=contract_in.params,
        to_town_id=contract_in.to_town_id
    )
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    return new_contract

@router.get("", response_model=List[schemas.ContractResponse])
def get_contracts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return db.query(models.Contract).all()

@router.get("/{contract_id}", response_model=schemas.ContractResponse)
def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract
