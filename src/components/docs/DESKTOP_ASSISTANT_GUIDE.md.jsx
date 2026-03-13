# Desktop Assistant Guide (Phase 6)

This guide explains hotword, overlay, multi-window, and recovery. See app components:
- components/voice/hotword.js
- components/desktop/Overlay.jsx
- components/desktop/Watchdog.jsx
- components/desktop/index.jsx (desktopBridge)

Usage:
- Hotword auto-starts in MiniMonitor; trigger with "Hey Sree" (energy threshold fallback).
- Overlay: Ctrl+Space to show; auto-hides after 5s.
- Recovery: desktopBridge.recoverAll() resets voice, hotword, screen context, overlay, and windows.