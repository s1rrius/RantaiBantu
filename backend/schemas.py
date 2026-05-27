from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models import RoleEnum, TransactionStatus

class UserBase(BaseModel):
    username: str
    role: RoleEnum
    town_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: RoleEnum
    town_id: Optional[str]
    public_key: str
    created_at: datetime
    private_key_enc: Optional[str] = None  # Returned ONLY on register

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TownBase(BaseModel):
    name: str

class TownResponse(TownBase):
    id: str
    balance: float

    class Config:
        orm_mode = True

class SignatureResponse(BaseModel):
    id: str
    validator_id: str
    signature: str
    signed_at: datetime

    class Config:
        orm_mode = True

class ContractBase(BaseModel):
    name: str
    contract_type: str
    params: str  # JSON string
    to_town_id: str

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: str
    status: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class TransactionCreate(BaseModel):
    to_town_id: str
    amount: float
    description: str
    required_validators: int
    contract_id: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    from_user_id: str
    to_town_id: str
    amount: float
    description: str
    required_validators: int
    contract_id: Optional[str]
    contract: Optional[ContractResponse] = None
    status: TransactionStatus
    block_id: Optional[str]
    created_at: datetime
    signatures: List[SignatureResponse] = []

    class Config:
        orm_mode = True

class SignRequest(BaseModel):
    signature: str

class BlockResponse(BaseModel):
    id: str
    index: int
    previous_hash: str
    hash: str
    timestamp: datetime
    transactions: List[TransactionResponse] = []

    class Config:
        orm_mode = True
