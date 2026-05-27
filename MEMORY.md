# MEMORY.md

## Project Overview
**Purpose**: A blockchain simulation for government fund distribution to small towns.
**Scope**: Backend API (FastAPI) handling blocks, transactions, cryptographic signing, and users/towns. Frontend SPA (HTML/CSS/JS) demonstrating a transparent ledger.

## Architecture
**Backend**: Python, FastAPI, SQLite (SQLAlchemy ORM), `cryptography` (Ed25519 signatures), `hashlib` (SHA-256 blocks).
**Frontend**: Plain HTML, CSS, JavaScript communicating via REST APIs and WebSockets.
**Smart Contracts**: Custom Rule Engine (`backend/contracts/engine.py`) supporting simplified Governance policies (Government + Town Representative).
**Integrations**: WebSocket for real-time updates (blocks added, transactions confirmed/signed).

## Core Components
**Users**: Government (sends/signs), Town Representative (receives/signs), Admin.
**Transactions**: Funds transferred, pending validation until Contract rules are satisfied.
**Contracts**: Simplified Governance (requires both Government and recipient Town Representative to sign).
**Blocks**: Confirmed transactions are bundled into hashed blocks.
**Crypto**: Ed25519 keypairs. Private keys are stored as hex in the database (`private_key_enc`) for simulation simplicity, but are only returned to the user during registration.

## Key Decisions
**Decision**: Store private keys in the database.
**Reason**: Simplifies the simulation by allowing the system to "retrieve" keys if needed for demo purposes, though it deviates from real-world blockchain practices where keys stay client-side.
**Decision**: Use plain HTML/CSS/JS for frontend.
**Reason**: User requested plain frontend, avoiding complex build steps but ensuring it works out-of-the-box.
**Decision**: Use FastAPI with SQLite.
**Reason**: Lightweight, standard tools suitable for this simulation, fulfilling prompt specifications.
**Decision**: Implement "Logic-as-Data" (Smart Contracts).
**Reason**: Decouples the confirmation rules from the hardcoded backend, allowing for complex governance simulations.
**Decision**: Allow Town Representatives to sign transactions.
**Reason**: Governance policies often require a town representative's signature for funds to be released to their specific town.

## Constraints
**Technical**: Need to perform client-side Ed25519 signing. Will use `@noble/ed25519` via CDN.
**Business**: System is a simulation; centralized approach to blockchain without P2P networking, using instant consensus upon reaching signature threshold.

### Running the Project
The project is designed to be run using the `run.bat` script in the root directory.

**Automated Launch**:
1. Run `run.bat`
2. The script will:
   - Check for Python.
   - Create a virtual environment in `backend\venv` if it doesn't exist.
   - Install dependencies from `backend\requirements.txt` if needed.
   - Start the Backend (FastAPI) and Frontend (Flask) in separate windows.
   - Open the application in your default browser.

### Manual Setup (Optional)
If you prefer to run components manually:

**Backend**:
1. `cd backend`
2. `python -m venv venv`
3. `.\venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. `uvicorn main:app --reload`

**Frontend**:
1. `pip install flask`
2. `python frontend/serve_frontend.py`

## Documentation
- **README.md**: Contains a detailed "How to Use" guide for all UI buttons and data columns.
