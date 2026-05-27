# Blockchain Simulation — Government Fund Distribution
## Project Summary & Specification

---

## 1. What Is Blockchain? (Your Crash Course)

A blockchain is a **chain of blocks**, where each block contains a set of transactions. The key properties that make it useful for a transparency app like this are:

- **Immutability** — once a block is written, it cannot be changed without invalidating every block after it.
- **Distributed visibility** — every participant can see the full chain.
- **Cryptographic integrity** — each block references the hash (a fingerprint) of the previous block. If any data is tampered with, all subsequent hashes break.
- **Consensus** — transactions are only confirmed when enough validators agree and sign off.

In your simulation:
> The government sends funds to a small town. Before the transaction is recorded as confirmed on the chain, a required number of citizen validators must cryptographically sign it. Everyone can observe the full ledger in real time.

---

## 2. How Blocks & Transactions Work (In This App)

### A Transaction (pending)
```
{
  "id": "txn_abc123",
  "from": "Government",
  "to": "Town of Bagumbayan",
  "amount": 500000,
  "description": "Road infrastructure funds - Q2 2026",
  "required_validators": 3,
  "signatures": [],
  "status": "pending"
}
```

### A Block (confirmed)
```
{
  "index": 42,
  "timestamp": "2026-05-07T10:00:00Z",
  "transactions": [ ...list of confirmed transactions... ],
  "previous_hash": "a3f9c...",
  "hash": "9b2d1...",
  "nonce": 0
}
```

Each block's `hash` is computed from its contents + the previous block's hash. This is what creates the "chain."

---

## 3. Cryptographic Key Signing — How Validators Work

Every user in the system gets a **keypair** on registration:
- A **private key** — secret, stored only by the user (or securely server-side).
- A **public key** — public, stored on the server, used to verify signatures.

When a citizen validates a transaction:
1. The backend sends them the transaction data.
2. They sign it with their private key → produces a **signature**.
3. The backend verifies the signature against their public key.
4. The signature is stored in the transaction's `signatures[]` list.
5. Once the required number of unique valid signatures is reached → the transaction is confirmed and written into a new block.

**Algorithm to use:** `Ed25519` (fast, modern, standard in Python via `cryptography` library).

---

## 4. Actors & Their Roles

| Role | What They Can Do |
|---|---|
| **Government** | Submit new transactions (sender), set required validator count per transaction |
| **Town Representative** | Receive funds, view transactions directed at their town |
| **Citizen** | View all transactions and blocks, sign/validate pending transactions |
| **Admin** | Manage users, view full system state, manually invalidate bad actors |

All roles can **register themselves** — a registration generates their keypair server-side. Their public key is stored in the DB; their private key is returned once at registration time and never stored again (or it can be stored encrypted — see Backend notes).

---

## 5. Transaction Lifecycle

```
[Government submits transaction]
        ↓
[Transaction stored as PENDING in DB]
        ↓
[Citizens see it in the "Pending Validation" feed]
        ↓
[Citizens sign with their private key]
        ↓
[Backend verifies each signature]
        ↓
[Once N valid unique signatures collected → CONFIRMED]
        ↓
[Transaction bundled into a new Block]
        ↓
[Block hashed and appended to the chain]
        ↓
[Everyone sees updated chain]
```

---

## 6. Backend Specification

### Stack
- **Language:** Python
- **Framework:** FastAPI
- **Database:** SQLite (via SQLAlchemy ORM)
- **Crypto:** `cryptography` library (Ed25519)
- **Hashing:** `hashlib` (SHA-256 for block hashes)

---

### Database Schema

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| username | String | Unique |
| password_hash | String | Bcrypt |
| role | Enum | `government`, `town`, `citizen`, `admin` |
| public_key | Text | Ed25519 public key, PEM encoded |
| private_key_enc | Text | Ed25519 private key — store encrypted or return once and discard |
| town_id | FK → towns | Nullable, for town reps and citizens |
| created_at | Datetime | |

#### `towns`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | Town name |
| balance | Float | Running total of confirmed received funds |

#### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| from_user_id | FK → users | Sender (government) |
| to_town_id | FK → towns | Recipient town |
| amount | Float | |
| description | Text | Purpose of the funds |
| required_validators | Int | Set by government at submission |
| status | Enum | `pending`, `confirmed`, `rejected` |
| block_id | FK → blocks | Nullable until confirmed |
| created_at | Datetime | |

#### `signatures`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| transaction_id | FK → transactions | |
| validator_id | FK → users | The citizen who signed |
| signature | Text | Base64-encoded Ed25519 signature |
| signed_at | Datetime | |

#### `blocks`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| index | Int | Sequential block number |
| previous_hash | String | Hash of block at index-1 |
| hash | String | SHA-256 of this block's contents |
| timestamp | Datetime | |

---

### API Endpoints

#### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user, returns public key + private key (once) |
| POST | `/auth/login` | Login, returns JWT token |

#### Transactions
| Method | Path | Description |
|---|---|---|
| POST | `/transactions` | Government submits a new transaction |
| GET | `/transactions` | List all transactions (with status filter) |
| GET | `/transactions/{id}` | Get single transaction detail + signatures |
| POST | `/transactions/{id}/sign` | Citizen signs a pending transaction |

#### Blocks
| Method | Path | Description |
|---|---|---|
| GET | `/blocks` | List all blocks (the full chain) |
| GET | `/blocks/{index}` | Get a specific block + its transactions |
| GET | `/blocks/validate` | Re-verify the full chain integrity |

#### Users / Towns
| Method | Path | Description |
|---|---|---|
| GET | `/towns` | List all towns |
| GET | `/towns/{id}` | Town detail + balance + transaction history |
| GET | `/users/me` | Get current user profile |
| GET | `/users` | Admin: list all users |

---

### Signing Verification Logic (Backend)

When `POST /transactions/{id}/sign` is called:

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import load_pem_public_key
import base64

def verify_signature(public_key_pem: str, message: str, signature_b64: str) -> bool:
    public_key = load_pem_public_key(public_key_pem.encode())
    signature = base64.b64decode(signature_b64)
    try:
        public_key.verify(signature, message.encode())
        return True
    except Exception:
        return False
```

The `message` to sign should be a canonical string of the transaction, e.g.:
```
"txn:{transaction_id}:{amount}:{to_town_id}:{created_at}"
```

This must be identical on client and server.

---

### Block Creation Logic

Triggered automatically when a transaction reaches `required_validators` valid signatures:

```python
import hashlib, json
from datetime import datetime

def create_block(transactions, previous_hash):
    block_data = {
        "index": get_next_index(),
        "timestamp": datetime.utcnow().isoformat(),
        "transactions": [t.id for t in transactions],
        "previous_hash": previous_hash,
    }
    block_data["hash"] = hashlib.sha256(
        json.dumps(block_data, sort_keys=True).encode()
    ).hexdigest()
    return block_data
```

**Genesis block** (index 0) has `previous_hash = "0" * 64`.

---

### Chain Validation Logic

On `GET /blocks/validate`, the backend:
1. Fetches all blocks ordered by index.
2. For each block, recomputes the hash from stored data and checks it matches the stored hash.
3. Checks that each block's `previous_hash` matches the actual hash of the preceding block.
4. Returns a report of valid/invalid status per block.

---

## 7. Frontend Specification

See `FRONTEND.md`.

---

## 8. Security Considerations for a Simulation

Since this is a simulation / educational app, a few practical simplifications are acceptable:

- **Private keys can be stored server-side** (encrypted with user's password hash as the key), returned via the API when the user wants to sign. In a real blockchain, the private key never leaves the client.
- **No proof-of-work** is needed for simulation — blocks are mined instantly on consensus.
- **No P2P network** — the server is the single source of truth. This is a "centralized blockchain simulation," which is fine for a transparency demo.

---

## 9. Project Folder Structure

```
blockchain-sim/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── models.py             # SQLAlchemy models
│   ├── schemas.py            # Pydantic schemas
│   ├── database.py           # DB connection + session
│   ├── auth.py               # JWT + bcrypt
│   ├── crypto.py             # Ed25519 key generation + signing utils
│   ├── blockchain.py         # Block creation, chain validation
│   ├── routers/
│   │   ├── transactions.py
│   │   ├── blocks.py
│   │   ├── users.py
│   │   └── towns.py
│   └── blockchain.db         # SQLite file (auto-created)
├── frontend/
│   └── (see FRONTEND.md)
├── BLOCKCHAIN_PROJECT.md     # This file
└── FRONTEND.md
```

---

## 10. What to Build First (Recommended Order)

1. `models.py` — define all DB tables.
2. `crypto.py` — Ed25519 keygen, sign, verify.
3. `auth.py` — register/login with JWT.
4. `blockchain.py` — block creation + chain validation.
5. `routers/transactions.py` — submit + sign transactions.
6. `routers/blocks.py` — expose the chain.
7. Frontend — connect to the live backend.

---

*Generated from design session — May 2026*