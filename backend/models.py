import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from database import Base

class RoleEnum(str, enum.Enum):
    government = "government"
    town_representative = "town_representative"
    citizen = "citizen"
    admin = "admin"

class TransactionStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(Enum(RoleEnum))
    public_key = Column(Text)
    private_key_enc = Column(Text, nullable=True)
    town_id = Column(String, ForeignKey("towns.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    town = relationship("Town", back_populates="users", foreign_keys=[town_id])

class Town(Base):
    __tablename__ = "towns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)
    balance = Column(Float, default=0.0)

    users = relationship("User", back_populates="town", foreign_keys=[User.town_id])
    transactions_received = relationship("Transaction", back_populates="recipient_town", foreign_keys="[Transaction.to_town_id]")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = Column(String, ForeignKey("users.id"))
    to_town_id = Column(String, ForeignKey("towns.id"))
    amount = Column(Float)
    description = Column(Text)
    required_validators = Column(Integer)
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=True)
    contract = relationship("Contract", back_populates="transactions")
    status = Column(Enum(TransactionStatus), default=TransactionStatus.pending)
    block_id = Column(String, ForeignKey("blocks.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[from_user_id])
    recipient_town = relationship("Town", back_populates="transactions_received", foreign_keys=[to_town_id])
    signatures = relationship("Signature", back_populates="transaction")
    block = relationship("Block", back_populates="transactions")

class Signature(Base):
    __tablename__ = "signatures"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String, ForeignKey("transactions.id"))
    validator_id = Column(String, ForeignKey("users.id"))
    signature = Column(Text)
    signed_at = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="signatures")
    validator = relationship("User", foreign_keys=[validator_id])

class Block(Base):
    __tablename__ = "blocks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    index = Column(Integer, unique=True, index=True)
    previous_hash = Column(String)
    hash = Column(String, unique=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="block")

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    contract_type = Column(String)  # e.g., "multisig", "milestone"
    params = Column(Text)  # JSON encoded parameters
    status = Column(String, default="active")
    to_town_id = Column(String, ForeignKey("towns.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="contract")
    recipient_town = relationship("Town")
