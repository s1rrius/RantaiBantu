from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import models
import schemas
from auth import get_current_active_user
import crypto
from blockchain import create_block
from websocket_manager import manager
from contracts.engine import evaluate_contract

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("", response_model=schemas.TransactionResponse)
async def submit_transaction(
    tx_in: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != models.RoleEnum.government:
        raise HTTPException(status_code=403, detail="Only government can submit transactions")
    
    if not tx_in.contract_id:
        raise HTTPException(status_code=400, detail="Contract ID is mandatory for all transactions")

    new_tx = models.Transaction(
        from_user_id=current_user.id,
        to_town_id=tx_in.to_town_id,
        amount=tx_in.amount,
        description=tx_in.description,
        required_validators=tx_in.required_validators, # Keep for DB compatibility
        contract_id=tx_in.contract_id
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    
    await manager.broadcast({"type": "transaction.created", "transaction_id": new_tx.id})
    return new_tx

@router.get("", response_model=List[schemas.TransactionResponse])
def get_transactions(
    status: Optional[models.TransactionStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)
    if status:
        query = query.filter(models.Transaction.status == status)
    return query.order_by(models.Transaction.created_at.desc()).all()

@router.get("/{tx_id}", response_model=schemas.TransactionResponse)
def get_transaction(
    tx_id: str,
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.post("/{tx_id}/sign", response_model=schemas.TransactionResponse)
async def sign_transaction(
    tx_id: str,
    sign_req: schemas.SignRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in [models.RoleEnum.government, models.RoleEnum.town_representative]:
        raise HTTPException(status_code=403, detail="Only government or town representatives can sign")

    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx.status != models.TransactionStatus.pending:
        raise HTTPException(status_code=400, detail="Transaction is not pending")

    existing_sig = db.query(models.Signature).filter(
        models.Signature.transaction_id == tx_id,
        models.Signature.validator_id == current_user.id
    ).first()
    if existing_sig:
        raise HTTPException(status_code=400, detail="Already signed")

    # Canonical message
    message = f"txn:{tx.id}:{tx.amount}:{tx.to_town_id}:{tx.created_at.isoformat()}"
    
    is_valid = crypto.verify_signature(current_user.public_key, message, sign_req.signature)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid signature")

    new_sig = models.Signature(
        transaction_id=tx.id,
        validator_id=current_user.id,
        signature=sign_req.signature
    )
    db.add(new_sig)
    db.commit()
    db.refresh(tx)

    await manager.broadcast({"type": "transaction.signed", "transaction_id": tx.id})

    # Use Smart Contract Engine to evaluate confirmation
    if evaluate_contract(db, tx):
        block = create_block(db, [tx])
        await manager.broadcast({"type": "transaction.confirmed", "transaction_id": tx.id})
        await manager.broadcast({"type": "block.added", "block_index": block.index})

    db.refresh(tx)
    return tx
