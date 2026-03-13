# AEVOICE — Full Rebuild Guide

Complete production-ready architecture for the AEVOICE AI platform.

---

## 🗂 Project Structure

```
aevoice/
├── backend/     Node.js + Express API server
├── frontend/    Vite + React + TypeScript
├── desktop/     Tauri v2 desktop shell
├── shared/      Shared TypeScript types
├── scripts/     Dev and build scripts
├── .env         Root environment variables
└── package.json Root workspace config
```

---

## ⚡ Quick Start

### 1. Prerequisites

```bash
# Node.js 18+
node --version   # >= 18

# Rust (for desktop)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update

# macOS: Xcode CLI tools (for desktop)
xcode-select --install
```

### 2. Clone & Configure

```bash
git clone https://github.com/your-org/aevoice.git
cd aevoice

# Copy and configure environment
cp .env.example .env
# Edit .env with your real values
```

### 3. Install Dependencies

```bash
npm install           # installs all workspaces
```

### 4. Generate Desktop Icons (first time only)

```bash
# Drop your logo-1024.png into the repo root, then:
cd desktop
npx tauri icon ../logo-1024.png
```

### 5. Run in Development

```bash
# Option A: Start backend + frontend together
npm run dev:all

# Option B: Start individually
npm run dev:backend    # → http://localhost:3001
npm run dev:frontend   # → http://localhost:5173/app

# Option C: With desktop (in a separate terminal after dev:all)
cd desktop
npm run tauri:dev      # opens native window loading http://localhost:5173/app
```

---

## 🏗 Production Build

```bash
# Build frontend + desktop
npm run build:all

# Or build for specific platform
cd desktop
npm run tauri:build:macos    # → .app + .dmg
npm run tauri:build:windows  # → .exe installer
npm run tauri:build:linux    # → .deb + .AppImage

# Build outputs:
# desktop/src-tauri/target/release/bundle/
# ├── macos/    AEVOICE.app, AEVOICE.dmg
# ├── nsis/     AEVOICE_1.0.0_x64-setup.exe
# └── deb/      aevoice_1.0.0_amd64.deb
```

---

## 🔌 API Routes (Backend)

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/health` | Health check |
| `GET`  | `/auth/me` | Get current user |
| `POST` | `/auth/session` | Exchange Base44 token → local JWT |
| `POST` | `/auth/logout` | Clear session |
| `GET`  | `/clients/:clientId` | Get client/tenant data |
| `GET`  | `/apps/:appId/entities/:entityName` | List entity records |
| `GET`  | `/apps/:appId/entities/:entityName/:id` | Get single record |
| `POST` | `/apps/:appId/entities/:entityName` | Create record |
| `PUT`  | `/apps/:appId/entities/:entityName/:id` | Update record |
| `DELETE` | `/apps/:appId/entities/:entityName/:id` | Delete record |
| `POST` | `/proxy/functions/:functionName` | Invoke Base44 backend function |

---

## 🌐 Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | → `/app` | Redirect |
| `/app` | `AppPage` | Login / public entry |
| `/dashboard` | `DashboardPage` | Main dashboard |
| `/settings` | `SettingsPage` | Account settings |

---

## 🖥 Desktop (Tauri v2)

| Mode | URL Loaded |
|------|-----------|
| Dev  | `http://localhost:5173/app` |
| Prod | `../frontend/dist/index.html` |
| Identifier | `com.aevoice.app` |

---

## 🔑 Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `BASE44_APP_ID` | Your Base44 Application ID |
| `BASE44_CLIENT_ID` | Your Base44 Client ID |
| `BASE44_API_KEY` | Your Base44 API Key |
| `BASE44_APP_BASE_URL` | Base44 API base URL (`https://api.base44.com`) |
| `SESSION_SECRET` | Random 64-char string for session signing |
| `JWT_SECRET` | Random 64-char string for JWT signing |
| `VITE_API_BASE_URL` | Frontend → backend URL (`http://localhost:3001` in dev) |
| `VITE_BASE44_APP_ID` | App ID accessible in frontend |

### Optional

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `RUST_LOG` | Rust log level (`info`, `debug`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `STRIPE_API_KEY` | Stripe API key |
| `SENDGRID_API_KEY` | SendGrid API key |

---

## 🔒 Security Architecture

- All API keys live in backend `.env` only — never exposed to frontend
- Frontend calls backend proxy → backend calls Base44
- JWT tokens for session persistence (24h expiry)
- CORS locked to known frontend origins
- Rate limiting (500 req / 15 min)
- Helmet for HTTP security headers

---

## 🧩 Key Files

| File | Purpose |
|------|---------|
| `backend/src/lib/base44Client.js` | Server-to-Base44 API calls |
| `frontend/src/api/base44Client.ts` | Frontend API wrapper (all via proxy) |
| `frontend/src/hooks/useSession.ts` | Session loading + auth state |
| `desktop/src-tauri/tauri.conf.json` | Tauri v2 configuration |
| `shared/types.ts` | Shared TypeScript interfaces |

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `cargo: command not found` | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Desktop icons missing | `cd desktop && npx tauri icon logo-1024.png` |
| CORS errors | Check `FRONTEND_URL` in backend `.env` |
| JWT invalid | Verify `JWT_SECRET` matches between restarts |
| Backend 500 on entity calls | Verify `BASE44_API_KEY` and `BASE44_APP_ID` are set |