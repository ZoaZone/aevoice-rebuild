# AEVOICE Desktop App — Tauri v2

Complete desktop wrapper for the AEVOICE AI platform using **Tauri v2**.
Targets **macOS**, **Windows**, and **Linux**.

---

## 📁 File Structure (copy into your project root)

```
your-project-root/
├── src-tauri/                    ← Copy this entire folder to project root
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── entitlements.plist        ← macOS entitlements
│   ├── capabilities/
│   │   └── default.json          ← Tauri v2 permission model
│   ├── icons/                    ← App icons (see Icon Setup below)
│   └── src/
│       ├── main.rs               ← Entry point
│       ├── lib.rs                ← App initialization + plugin registration
│       ├── commands.rs           ← All IPC Rust commands
│       ├── store.rs              ← Typed store wrappers
│       └── keychain.rs           ← Cross-platform secure credential store
├── package.json                  ← Add scripts from package.json.patch
└── .env                          ← Copy from .env.example
```

---

## 🚀 Quick Start

### 1. Install Prerequisites

```bash
# Rust (required)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update

# Node.js 18+ (required)
# Already installed if you're running the AEVOICE web app

# macOS: Xcode Command Line Tools
xcode-select --install

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf build-essential curl wget file libssl-dev libxdo-dev \
  libsoup-3.0-dev libjavascriptcoregtk-4.1-dev

# Linux (Fedora/RHEL)
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel \
  librsvg2-devel openssl-devel
```

### 2. Copy Files

```bash
# From the AEVOICE project root:
cp -r components/desktop/tauri/src-tauri ./src-tauri
cp components/desktop/tauri/.env.example ./src-tauri/.env
```

### 3. Merge package.json

Add to your root `package.json`:

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-http": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tauri-apps/plugin-process": "^2.0.0",
    "@tauri-apps/plugin-autostart": "^2.0.0",
    "@tauri-apps/plugin-os": "^2.0.0",
    "@tauri-apps/plugin-clipboard-manager": "^2.0.0"
  }
}
```

### 4. Configure Environment

Edit `src-tauri/.env`:
```
VITE_BASE44_APP_URL=https://your-aevoice-app.base44.app
BASE44_APP_ID=your_app_id_here
```

### 5. Set Up Icons

```bash
# Install Tauri CLI globally or via npx
npm install -g @tauri-apps/cli@latest

# Generate icons from a 1024x1024 PNG source image
npx tauri icon path/to/your-logo-1024.png
# This auto-generates all required icon sizes in src-tauri/icons/
```

### 6. Install Dependencies & Run

```bash
npm install
npm run tauri:dev
```

---

## 🛠 Available Commands

| Command | Description |
|---------|-------------|
| `npm run tauri:dev` | Start dev server with hot reload |
| `npm run tauri:build` | Production build (all targets) |
| `npm run tauri:build:macos` | Universal macOS binary (Intel + Apple Silicon) |
| `npm run tauri:build:windows` | Windows x64 installer |
| `npm run tauri:build:linux` | Linux x64 (.deb + .rpm + AppImage) |
| `npm run tauri:info` | Show Tauri environment info |

---

## 🔌 IPC Commands (Frontend → Rust)

Use these from any React component or the Sree engine:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Get/Set assistant mode
const mode = await invoke('get_assistant_mode');
await invoke('set_assistant_mode', { mode: { mode: 'voice', sub_mode: 'sree', auto_start: false, language: 'en-US' } });

// Feature flags
const flags = await invoke('get_feature_flags');

// Knowledge base retrieval
const results = await invoke('kb_retrieval', {
  request: { query: 'how to book appointment', client_id: 'xxx', top_k: 5 }
});

// LLM proxy
const response = await invoke('llm_proxy', {
  request: { prompt: 'Summarize this call', model: 'gpt-4o-mini' }
});

// Get client info
const client = await invoke('get_my_client');

// Sree auto-scan
await invoke('sree_auto_scan_service', { scanTarget: 'full' });

// Generic backend passthrough (any Base44 function)
const data = await invoke('invoke_backend', {
  request: { function_name: 'getMyAgents', payload: {}, auth_token: 'bearer_token' }
});

// Secure credential store (uses OS keychain)
await invoke('secure_store_set', { key: 'api_token', value: 'my-secret' });
const token = await invoke('secure_store_get', { key: 'api_token' });
await invoke('secure_store_delete', { key: 'api_token' });

// App info
const info = await invoke('get_app_info');

// Open DevTools (debug builds only)
await invoke('open_devtools');
```

---

## 🔒 Security

| Feature | Implementation |
|---------|----------------|
| Secure storage | OS keychain via `keyring` crate (macOS Keychain, Windows Credential Manager, Linux libsecret) |
| CSP | Strict CSP configured in `tauri.conf.json` allowing only known AEVOICE/Base44 hosts |
| IPC permissions | Tauri v2 capability model in `capabilities/default.json` |
| HTTPS only | `reqwest` built with `rustls-tls`, no native TLS |
| Single instance | `tauri-plugin-single-instance` prevents duplicate windows |
| Code signing | Placeholders configured — add credentials to `.env` for production |

---

## 📦 Build Output Locations

After `npm run tauri:build`:

```
src-tauri/target/release/bundle/
├── macos/           → AEVOICE.app + AEVOICE.dmg
├── nsis/            → AEVOICE_1.0.0_x64-setup.exe  (Windows)
├── msi/             → AEVOICE_1.0.0_x64_en-US.msi  (Windows)
├── deb/             → aevoice_1.0.0_amd64.deb       (Linux)
├── rpm/             → aevoice-1.0.0-1.x86_64.rpm    (Linux)
└── appimage/        → aevoice_1.0.0_amd64.AppImage  (Linux)
```

---

## 🍎 macOS Code Signing (Production)

```bash
# Add to src-tauri/.env:
APPLE_CERTIFICATE=<base64-encoded-p12>
APPLE_CERTIFICATE_PASSWORD=<p12-password>
APPLE_SIGNING_IDENTITY=Developer ID Application: Your Name (XXXXXXXXXX)
APPLE_ID=your@apple.id
APPLE_PASSWORD=<app-specific-password>
APPLE_TEAM_ID=XXXXXXXXXX

# Then build:
npm run tauri:build:macos
```

---

## 🧩 Integration with Sree Architecture

The desktop app is fully compatible with the existing Sree unified architecture:
- The Tauri window loads the **same React app** as the web version
- `window.__TAURI__` is set to `true` automatically by Tauri
- The existing `components/desktop/` detection code (`window.__TAURI__`) continues to work
- All Sree engine phases (1–17) work identically
- `components/desktop/api.js` can be extended to use `invoke()` for native features

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `cargo: command not found` | Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| `webkit2gtk not found` (Linux) | Install system deps (see Prerequisites above) |
| Icons missing error | Run `npx tauri icon your-logo.png` first |
| CSP blocking API calls | Add domain to `security.csp` in `tauri.conf.json` |
| Keychain dialog on macOS | Expected on first run — grant access once |
| Hot reload not working | Ensure `npm run dev` runs on port 5173 |

---

## 📋 Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BASE44_APP_URL` | ✅ | Deployed AEVOICE app URL |
| `BASE44_APP_ID` | ✅ | Base44 application ID |
| `RUST_LOG` | Optional | Logging level (`info`/`debug`/`warn`) |
| `APPLE_*` variables | macOS prod only | Code signing credentials |
| `WINDOWS_CERTIFICATE_THUMBPRINT` | Windows prod only | Code signing |