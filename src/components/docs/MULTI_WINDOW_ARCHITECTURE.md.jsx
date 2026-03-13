# Multi-Window Architecture

desktopBridge exposes stubs for Electron/Tauri to open:
- MiniMonitor window
- Overlay window

In web mode, event bus (send/on) provides cross-component signaling; OS windows are handled natively by the desktop wrappers.