# Desktop API Reference (Sree Unified Widget Framework)

This document describes the desktop runtime layer implemented under `components/desktop/`.

## Detection
- `isDesktopApp()` (SSR-safe) from `components/utils/desktopContext.js`

## Bridge: components/desktop/index.js
- `desktopBridge.getScreenContext(): Promise<Context|null>`
- `desktopBridge.pollScreenContext(cb, intervalMs): () => void`
- `desktopBridge.captureScreen(): Promise<string|null>` (PNG dataURL)
- `desktopBridge.startMic(): Promise<boolean>`
- `desktopBridge.stopMic(): Promise<boolean>`
- `desktopBridge.onVoiceData(cb): () => void` → `{ transcript, isFinal }`
- `desktopBridge.onVoiceError(cb): () => void`
- `desktopBridge.showNotification(title, body): Promise<boolean>`
- `desktopBridge.setTrayState(state): Promise<boolean>`
- All calls are wrapped with `safeCall(fn, label)` and never throw synchronously.

## Fallbacks
- Electron → uses `window.electron.*`
- Tauri → uses `window.__TAURI__.invoke`
- Browser → Screen Capture via `getDisplayMedia`, Voice via Web Speech API, Notifications via Notification API

## Error Handling
- `safeCall` groups errors with `console.groupCollapsed` and returns `null`/`false`.