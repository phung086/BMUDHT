# Fintech Demo (secure transactions prototype)

Quick start (dev):

1. Backend

```powershell
Set-Location -Path .\backend
npm install
npm start
```

2. Frontend

```powershell
Set-Location -Path .\frontend
npm install
npm start
```

3. Alternatively run with Docker Compose (requires Docker)

```powershell
docker-compose up --build
```

Notes:

- Replace secrets in `.env` or environment before production.
- AES_KEY: the backend requires an environment variable `AES_KEY` that is 32 bytes (64 hex characters). Example in `.env.example` uses a demo value — replace it with a secure random 64-hex string in production.
- CSRF: the app uses a double-submit cookie CSRF pattern. The frontend fetches `/api/csrf-token` and includes the returned token in the `X-CSRF-Token` header for mutating requests. Keep this enabled in production; do NOT disable CSRF for public deployments.

Quick notes for local dev:

- Ensure `d:\BMUDHT\backend\.env` contains:

```
JWT_SECRET=dev_jwt_secret_change_me
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_me
# 32 bytes hex (64 chars) for AES-256-GCM
AES_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
NODE_ENV=development
PORT=3001
```

Replace with secure values before publishing.

Demo checklist (quick run for instructor)

1. Start backend

```powershell
Set-Location -Path .\backend
npm install
npm start
```

2. Start frontend

```powershell
Set-Location -Path .\frontend
npm install
npm start
```

3. Quick demo flow (in browser)

- Open http://localhost:3000
- Register two users (e.g., alice/bob or carol/dave) via the Register page.
- Login as the first user, use the Dashboard to `Nạp tiền` (deposit) and then `Chuyển khoản` to the other user.
- Observe toast confirmations and updated balances in the header card and history table.
- (Optional) Use Admin panel to view audit logs.

Notes for presenting security features later:

- AES-256-GCM is used for field-level encryption of transaction details. The backend requires `AES_KEY` (32 bytes hex).
- MFA (TOTP) endpoints and refresh token cookie logic are implemented; enable/verify MFA via the Dashboard MFA panel.
- CSRF is protected using the double-submit cookie pattern; the frontend fetches `/api/csrf-token` and includes `X-CSRF-Token` for mutating requests.
