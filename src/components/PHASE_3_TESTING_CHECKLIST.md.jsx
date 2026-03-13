# Phase 3 Testing Checklist

## Browser
- [ ] Screen capture (snapshot) works
- [ ] Voice (Web Speech) transcribes and sends on final
- [ ] Widget states switch: Expanded/Minimized/Mini Monitor

## Electron
- [ ] `getScreenContext` returns app/window
- [ ] `captureScreen` returns PNG dataURL
- [ ] Mic stream events fire via `onVoiceData`
- [ ] Tray state updates
- [ ] Notifications appear

## Tauri
- [ ] Context polling via `invoke('get_screen_context')`
- [ ] Capture via `invoke('capture_screen')`
- [ ] Voice via plugin/invoke

## Widget Integration
- [ ] DesktopAgent uses `pollScreenContext`
- [ ] MiniMonitor uses `captureScreen` (+ Live Preview)
- [ ] FloatingWidget voice works desktop+browser
- [ ] WidgetManager auto-switch Desktop→Mini Monitor

## Build & Lint
- [ ] No SSR warnings
- [ ] No unused imports
- [ ] No circular deps