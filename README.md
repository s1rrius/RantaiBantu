# 🛡️ RantaiBantu — Blockchain Government Fund Simulation

RantaiBantu is a high-fidelity **Blockchain Simulation** designed to demonstrate transparency in government fund distribution to local towns. It features a custom **Smart Contract Engine**, real-time cryptographic validation, and a live-updating ledger.

---

## 🚀 Quick Start (Windows)

The easiest way to run the entire project (Backend + Frontend) is using the provided batch script:

1.  **Clone/Open** the repository.
2.  **Run** the launcher:
    ```bash
    .\run.bat
    ```
    *This will open two terminal windows (Backend & Frontend) and launch your browser to `http://127.0.0.1:5000`.*

---

## ✨ Core Features

### 1. Programmable Smart Contracts
Unlike simple ledgers, RantaiBantu uses a **Logic-as-Data** approach. The Government can define specific "Policies" for each fund:
*   **Governance Policy**: Requires $N$ citizens to sign **AND** the specific Town Representative to approve.
*   **Multi-sig Policy**: Requires a pre-defined list of specific auditors or administrators to sign.
*   **Basic Policy**: Standard $N$ signature threshold.

### 2. Cryptographic Integrity
*   **Ed25519 Signing**: Every user (Government, Citizen, Rep) has a unique cryptographic keypair. Transactions are only valid if signed by the correct private key.
*   **Hashed Blocks**: Confirmed transactions are bundled into blocks. Each block contains the hash of the previous one, ensuring the chain is immutable.
*   **Chain Validation**: A built-in explorer tool to verify the integrity of the entire blockchain in real-time.

### 3. Real-Time Transparency
*   **WebSocket Updates**: New blocks and incoming signatures appear instantly on the dashboard without refreshing.
*   **Town Balances**: Track the confirmed funds received by each town compared to pending transfers.

---

## 🛠️ Technical Stack

*   **Backend**: Python, FastAPI, SQLAlchemy (SQLite), Cryptography (Ed25519).
*   **Smart Contract Engine**: Custom Python evaluation engine (`backend/contracts/engine.py`).
*   **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), JavaScript (ES6+).
*   **Communication**: RESTful APIs + WebSockets.

---

## 📂 Project Structure

```text
blokcenopoiki/
├── backend/                # FastAPI Application
│   ├── contracts/          # Smart Contract Logic & Engine
│   ├── routers/            # API Endpoints (Tx, Blocks, Users, Towns)
│   ├── models.py           # Database Models
│   └── crypto.py           # Ed25519 Signing Utilities
├── frontend/               # SPA Web Interface
│   ├── index.html          # Main Entry
│   ├── app.js              # Frontend Logic & Signing
│   └── serve_frontend.py   # Flask static file server
├── run.bat                 # One-click Windows Launcher
└── README.md               # You are here
```

---

## 📖 How to Use

### 🧭 Navigation & View Buttons
*   **Dashboard**: A high-level overview showing total blocks, pending transactions, and total funds distributed across all towns.
*   **Pending Transaction**: The "Mempool" where transactions wait for cryptographic signatures before being added to a block.
*   **Explorer**: The public ledger showing every confirmed block and its cryptographic hash links.
*   **Towns**: A summary view of all registered towns and their currently confirmed balances.
*   **Submit** *(Government Only)*: Interface to initiate a new fund transfer using a specific town's policy.
*   **Policies** *(Town Rep Only)*: Define the "Smart Contracts" (Governance or Multi-sig) that the Government must follow to send funds to your town.
*   **Admin** *(Admin Only)*: A directory of all registered users, their roles, and their public keys.

### ⚙️ Action Buttons
*   **Register / Login**: Create or access your role-based account.
*   **Sign Transaction**: Opens the signing modal. *Available only to users authorized by the specific policy (e.g., Citizens of the recipient town or Multi-sig participants).*
*   **Validate Chain Integrity**: Performs a recursive hash check on the entire blockchain to ensure no data has been tampered with.
*   **Copy to Clipboard**: Quick-save your **Private Key** during registration (essential for signing!).

### 📊 Data Columns & Information
*   **Pending Validation**:
    *   **ID**: The unique transaction identifier.
    *   **Policy**: Details of the Smart Contract rule (e.g., "Requires 3 Citizen signatures + Town Rep approval").
    *   **Signatures**: Real-time count of signatures collected vs. required threshold.
*   **Blockchain Explorer**:
    *   **Hash**: The unique digital fingerprint of the block.
    *   **Prev Hash**: The hash of the block immediately before it, forming the immutable chain.
    *   **Tx Count**: How many transactions were bundled into this specific block.
*   **Admin User List**:
    *   **Public Key**: The hex identifier used by the system to verify that your signatures are authentic without needing your private key.

---

## 🛡️ Security Note
This is a **simulation**. For ease of use, private keys are generated and displayed once during registration. In a production blockchain, private keys would never leave the user's local device.

---

*Built with ❤️ for Transparency & Governance.*
