# FRONTEND.md — Blockchain Simulation: Government Fund Distribution

## Backend Connection

- **Base URL:** `http://localhost:8000`
- **Auth:** JWT Bearer token. After login, include `Authorization: Bearer <token>` on all protected requests.
- **WebSocket (optional, recommended):** Connect to `ws://localhost:8000/ws` to receive real-time push events when transactions are signed, confirmed, or a new block is added.

---

## Pages / Views

### 1. Register Page
**Route:** `/register`

- Form fields: username, password, role selection (`government`, `town_representative`, `citizen`), and town name (if role is `town_representative` or `citizen`)
- On submit: `POST /auth/register`
- On success: display the returned **private key** prominently with a warning that it will never be shown again. Provide a copy-to-clipboard button. Redirect to login after acknowledgment.

---

### 2. Login Page
**Route:** `/login`

- Form fields: username, password
- On submit: `POST /auth/login`
- On success: store JWT token in memory or localStorage. Redirect to dashboard.

---

### 3. Dashboard
**Route:** `/dashboard`

Shown to all roles. Content varies by role.

- Display total number of confirmed blocks on the chain.
- Display count of pending transactions awaiting validation.
- Display total funds distributed across all towns (sum of all confirmed transactions).
- Show a feed of the 5 most recent blocks added to the chain.
- Show a feed of the 5 most recently submitted pending transactions.
- If the user is a citizen: show how many transactions they have signed.
- If the user is a government account: show how many transactions they have submitted.

**API calls:**
- `GET /blocks` (for recent blocks)
- `GET /transactions?status=pending` (for pending count + feed)
- `GET /towns` (for total funds distributed)

---

### 4. Submit Transaction (Government Only)
**Route:** `/submit`

- Visible only when logged in as `government` role.
- Form fields: recipient town (dropdown from `GET /towns`), amount (number), description (text), required number of validators (number input — government sets this per transaction).
- On submit: `POST /transactions`

---

### 5. Pending Transactions — Validation Queue
**Route:** `/pending`

- List all transactions with `status: pending`.
- Each transaction card shows: sender, recipient town, amount, description, required validators, current signature count (e.g. "2 / 3 signed"), and list of validator usernames who have already signed.
- If the logged-in user is a `citizen` and has not yet signed this transaction: show a **Sign** button.
- On click of Sign: prompt the user to paste their private key (since it was only given once at registration). The frontend uses this key to compute a signature over the canonical transaction string (see backend spec), then calls `POST /transactions/{id}/sign` with the signature.
- Do not store the private key anywhere after signing.

**API calls:**
- `GET /transactions?status=pending`
- `GET /transactions/{id}` (for detail view)
- `POST /transactions/{id}/sign`

---

### 6. Blockchain Explorer
**Route:** `/chain`

- Display all blocks in the chain in order, from newest to oldest.
- Each block shows: block index, timestamp, hash (truncated with full value on hover/click), previous hash, and number of transactions inside.
- Clicking a block expands it to show all transactions it contains.
- Each transaction in a block shows: sender, recipient town, amount, description, and the list of validator signatures (validator username + signature fingerprint).
- Include a **Validate Chain** button that calls `GET /blocks/validate` and shows a status per block (valid / tampered).

**API calls:**
- `GET /blocks`
- `GET /blocks/{index}`
- `GET /blocks/validate`

---

### 7. Transaction Detail
**Route:** `/transactions/{id}`

- Full detail view for a single transaction.
- Shows all fields: ID, status, sender, recipient, amount, description, required validators, current signature count, list of signers with timestamps.
- If pending and the current user hasn't signed: show Sign button (same private key flow as Validation Queue).

**API calls:**
- `GET /transactions/{id}`

---

### 8. Town Overview
**Route:** `/towns`

- List all towns.
- Each town card shows: town name, total balance (sum of confirmed received funds), and number of confirmed transactions received.
- Clicking a town opens a detail view showing full transaction history for that town.

**API calls:**
- `GET /towns`
- `GET /towns/{id}`

---

### 9. Admin Panel (Admin Role Only)
**Route:** `/admin`

- List all registered users with role, public key fingerprint, and registration date.
- No delete/edit required for now — read-only overview.

**API calls:**
- `GET /users` (admin-only endpoint)

---

## Shared / Global Components

### Navigation Bar
- Links to: Dashboard, Pending Transactions, Blockchain Explorer, Towns, Submit (government only), Admin (admin only).
- Show logged-in username and role.
- Logout button — clears token from memory.

### Real-Time Updates (WebSocket)
- Connect to `ws://localhost:8000/ws` after login.
- Listen for event types:
  - `transaction.signed` → update signature count on any open pending transaction view.
  - `transaction.confirmed` → move transaction from pending to confirmed, show notification.
  - `block.added` → append new block to the chain explorer, update dashboard stats.
- Show a toast/notification bar at the top when any of these events fire.

---

## Private Key Signing Flow (Client-Side Crypto)

When a citizen clicks **Sign**:

1. Prompt for their private key (PEM string).
2. Compute the canonical message string:
   ```
   txn:{transaction_id}:{amount}:{to_town_id}:{created_at}
   ```
3. Sign the message using Ed25519 with the provided private key.
4. Base64-encode the resulting signature.
5. Call `POST /transactions/{id}/sign` with body `{ "signature": "<base64>" }`.
6. Clear the private key from memory immediately after.

Use the `@noble/ed25519` npm package (browser-safe, zero dependencies) or equivalent for client-side signing.

---

## State Management

- Store JWT token and current user profile (username, role, town_id) in a global auth context.
- All protected routes redirect to `/login` if no token is present.
- Refresh transaction and block lists after any successful sign or submission action.

---

*Part of BLOCKCHAIN_PROJECT.md — May 2026*