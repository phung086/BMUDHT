# BMUDHT Fintech Demo

Interactive lab that demonstrates secure online banking flows (MFA, CSRF, audit logging) and common attack simulations (brute force, CSRF, OTP phishing, token replay). The project ships with a React frontend, an Express/SQLite backend, seed data, and demo scripts.

---

## 1. Prerequisites

- Windows 10/11, macOS, or Linux
- Node.js 18+ and npm 9+
- Git
- Optional: Docker Desktop (if you prefer containers)
- Optional: SQLite CLI (`sqlite3`) to inspect the local database

Check versions:

```powershell
node --version
npm --version
git --version
```

---

## 2. Clone The Repository

```powershell
git clone https://github.com/phung086/BMUDHT.git
cd BMUDHT
```

The workspace contains:

- `backend/`: Express API, Sequelize models, security middleware
- `frontend/`: React single-page app
- `database/`: schema and seed scripts
- `tests/`: attack simulations (`brute-force.js`, `sql-injection.js`)

---

## 3. Environment Configuration

Copy the sample environment and adjust secrets:

```powershell
Set-Location -Path .\backend
Copy-Item .env.example .env
```

Edit `backend/.env` and ensure the following keys exist. Replace demo values before production:

```
PORT=3001
NODE_ENV=development
JWT_SECRET=dev_jwt_secret_change_me
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_me
AES_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

- `AES_KEY` must be 32 bytes encoded as 64 hex characters (AES-256-GCM).
- Never commit real secrets; use environment variables or secret managers in production.

---

## 4. Database Setup (SQLite)

The backend uses a local SQLite file (`backend/database.sqlite`). It is created automatically on first run. To preload demo users/logs:

```powershell
Remove-Item .\database.sqlite -ErrorAction Ignore
sqlite3 .\database.sqlite ".read ..\database\schema.sql" ".read ..\database\init.sql"
```

If the SQLite CLI is not installed, just start the backend once; it will sync the schema but without seed data.

Seed credentials:

- Admin: `admin@fintech.com / admin123`
- Users: `user1@fintech.com / user123`, `user2@fintech.com / user123`, `user3@fintech.com / user123`

---

## 5. Run Locally (Backend + Frontend)

Start the API:

```powershell
Set-Location -Path ..\backend
npm install
npm start
```

Start the React app in a new shell:

```powershell
Set-Location -Path ..\frontend
npm install
npm start
```

Open `http://localhost:3000`. The frontend proxies API calls to `http://localhost:3001`.

To stop the dev servers, press `Ctrl+C` in each terminal.

---

## 6. Run With Docker Compose (Optional)

Requires Docker Desktop running.

```powershell
Set-Location -Path d:\BMUDHT
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- Stop containers: `docker-compose down`

---

## 7. Quick Functional Walkthrough

1. Register two new users (victim/attacker) from the Register page.
2. Login as user A, deposit funds via `Nạp tiền`, then transfer to user B.
3. Observe real-time balance updates, transaction history, and toast notifications.
4. Login as admin (`/admin` route) to review audit logs and account state.

---

## 8. Security Feature Checklist

- MFA (TOTP) setup/reset from the dashboard; OTPs logged in dev mode for demos only.
- JWT access + refresh token flow with HttpOnly refresh cookies.
- Double-submit cookie CSRF protection (`/api/csrf-token` issues token and cookie).
- Rate limiting and account lock after repeated login failures.
- Field-level AES-256-GCM encryption for sensitive data.
- Audit logging via Winston (`backend/logs/combined.log`, `error.log`).
- Mandatory OTP on transfers with signed receipts including immutable reference codes. Set `ENABLE_REFERENCE_LOOKUP=true` (demo only) to expose the intentionally insecure lookup endpoint for social-engineering scenarios.

---

## 9. Attack Simulation Scripts

All scripts assume the backend is running at `http://localhost:3001`.

### Brute Force Demo

```powershell
Set-Location -Path d:\BMUDHT
node .\tests\brute-force.js
```

Adjust `EMAIL` inside `tests/brute-force.js` to target a specific account. Watch the console for rate limiting and lock messages.

### SQL Injection Probe

```powershell
node .\tests\sql-injection.js
```

The payloads should fail; review server logs to verify sanitation and error handling.

---

## 10. Manual Demo Playbook

1. **OTP Phishing** – Enable MFA for a victim, capture OTP from backend logs, log in as attacker before victim uses it.
2. **Credential Stuffing** – Run `brute-force.js`, inspect lockouts in Admin > Audit or `combined.log`.
3. **Transaction Note Injection** – Submit HTML/JS in the transfer description to discuss XSS mitigation.
4. **CSRF Attempt** – Craft a self-submitting HTML form to `/api/transactions/transfer` without the `X-CSRF-Token`; expect 403.
5. **Token Replay** – Copy a victim `accessToken` from browser storage and call `/api/transactions/history` via `curl` or Postman.
6. **Privilege Escalation** – Use a non-admin token to call `/api/admin/users`; confirm 403 and log entry.
7. **Reference Replay (New)** – After a transfer, copy the reference from the success receipt. Enable `ENABLE_REFERENCE_LOOKUP=true` and request `/api/transactions/reference/<REF>` to illustrate how leaked references can expose transaction metadata or seed phishing scripts.

Use the admin panel and log files to narrate detection and response.

---

## 11. Troubleshooting

- **Port already in use**: stop other processes on 3000/3001 or change `PORT` in `.env` and update frontend proxy.
- **CSRF errors**: fetch `/api/csrf-token` before making POST/PUT/PATCH/DELETE requests; ensure cookies are allowed.
- **Database locked**: stop other SQLite clients; the dev server handles migrations automatically.
- **Invalid AES key**: confirm `AES_KEY` is exactly 64 hex characters.

---

## 12. Production Considerations

- Replace all sample secrets and rotate regularly.
- Host the backend behind HTTPS with a real DB (PostgreSQL/MySQL); update Sequelize config accordingly.
- Enable stronger MFA delivery (push/WebAuthn) to mitigate OTP phishing.
- Add anomaly detection, IP reputation checks, and monitoring for brute-force attempts.
- Harden Docker images, apply CI/CD linting and automated tests before deployment.

---

## 13. License

This repository is provided for educational/demo purposes. Adapt security controls to your compliance requirements before using in production environments.
