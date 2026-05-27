import hashlib
import json
from datetime import datetime
from sqlalchemy.orm import Session
import models

def get_next_index(db: Session) -> int:
    last_block = db.query(models.Block).order_by(models.Block.index.desc()).first()
    if not last_block:
        return 0
    return last_block.index + 1

def create_block(db: Session, transactions: list[models.Transaction]):
    index = get_next_index(db)
    
    if index == 0:
        previous_hash = "0" * 64
    else:
        last_block = db.query(models.Block).order_by(models.Block.index.desc()).first()
        previous_hash = last_block.hash

    block_data = {
        "index": index,
        "timestamp": datetime.utcnow().isoformat(),
        "transactions": [t.id for t in transactions],
        "previous_hash": previous_hash,
    }
    block_hash = hashlib.sha256(
        json.dumps(block_data, sort_keys=True).encode('utf-8')
    ).hexdigest()

    new_block = models.Block(
        index=index,
        previous_hash=previous_hash,
        hash=block_hash,
        timestamp=datetime.fromisoformat(block_data["timestamp"])
    )
    db.add(new_block)
    db.commit()
    db.refresh(new_block)

    for t in transactions:
        t.status = models.TransactionStatus.confirmed
        t.block_id = new_block.id
    
    # Add balance to town
    for t in transactions:
        town = db.query(models.Town).filter(models.Town.id == t.to_town_id).first()
        if town:
            town.balance += t.amount

    db.commit()
    return new_block

def validate_chain(db: Session):
    blocks = db.query(models.Block).order_by(models.Block.index.asc()).all()
    results = []
    
    for i, block in enumerate(blocks):
        block_data = {
            "index": block.index,
            "timestamp": block.timestamp.isoformat(),
            "transactions": [t.id for t in block.transactions],
            "previous_hash": block.previous_hash,
        }
        recomputed_hash = hashlib.sha256(
            json.dumps(block_data, sort_keys=True).encode('utf-8')
        ).hexdigest()

        is_valid = (recomputed_hash == block.hash)
        if i > 0:
            if blocks[i-1].hash != block.previous_hash:
                is_valid = False
        elif block.previous_hash != "0" * 64:
            is_valid = False

        results.append({
            "block_index": block.index,
            "is_valid": is_valid,
            "stored_hash": block.hash,
            "recomputed_hash": recomputed_hash
        })
    return results
