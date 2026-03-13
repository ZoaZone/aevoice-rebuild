# AEVOICE Desktop (Tauri) Wrapper

This folder contains a complete scaffold for packaging AEVOICE as a desktop app using Tauri.

Key features:
- Commands exposed to the frontend via `window.__TAURI__.invoke`:
  - `open_mini_monitor` – open always-on-top mini monitor window
  - `open_overlay` – open overlay window
  - `start_mic` – push-to-talk trigger (emits `voice:start` to webview)
  - `check_update` – run updater check
  - `capture_screen` and alias `screenshot` – attempt OS screenshot (fallback to web if unavailable)
- Global shortcut: Cmd/Ctrl + Space triggers push-to-talk by emitting `voice:start`
- macOS mic permission and entitlements included; Windows uses standard Win32 prompts
- Bridge API for Developer Sree commands via `dev_command` (supports `open/goto`, `browse/research`, `screenshot`)
- Reproducible CI builds for macOS and Windows with GitHub Actions

How to use:
1) Copy the `src-tauri` and `tauri.conf.json` to your desktop wrapper repo root.
2) Set `TAURI_APP_URL` in `tauri.conf.json` to your hosted AEVOICE web app URL.
3) Install Rust + Node, then run: `pnpm tauri dev` / `pnpm tauri build` (or `npx tauri`).

Integration points:
- Frontend calls in this app already use `window.__TAURI__.invoke` for:
  - `open_mini_monitor`, `open_overlay`, `check_update` (see components/desktop/index.js)
  - `capture_screen` (see components/desktop/screenCapture.js)
- Push-to-talk: Press Cmd/Ctrl+Space to emit `voice:start`; frontend listens (VoiceChatView / eventBus)
- Developer commands: Frontend can call `window.__TAURI__.invoke('dev_command', { command: 'open https://aevoice.ai' })`

Notes on Permissions:
- macOS: `NSMicrophoneUsageDescription` is set; screen capture permission is granted by macOS on first use (no Info.plist key). See entitlements.
- Windows: Traditional Win32 apps do not declare mic permission in a manifest; the first use triggers the OS-level consent.