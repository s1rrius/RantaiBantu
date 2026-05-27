import asyncio
from datetime import datetime
from pydantic import BaseModel

class Tx(BaseModel):
    created_at: datetime

t = Tx(created_at=datetime.utcnow())
print("Pydantic json:", t.json())
print("Python isoformat:", t.created_at.isoformat())
