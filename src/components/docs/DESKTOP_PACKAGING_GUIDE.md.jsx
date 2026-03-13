# Desktop Packaging Guide (Electron + Tauri)

This app ships a desktop runtime via Electron or Tauri. Files live outside this repo in product packaging repos. This guide documents required exports expected by the web runtime.

## Electron
Preload must expose:
- captureScreen, getScreenContext
- startMic, stopMic, onVoiceData, onVoiceError
- showNotification, setTrayState
- checkForUpdates, onUpdateEvent

Main must create tray menu with: Open Sree, Toggle Mini Monitor, Quit.
Use electron-updater; code signing per platform.

## Tauri
Commands to expose:
- capture_screen, get_screen_context
- start_mic, stop_mic
- show_notification
- check_update, install_update
- onUpdateEvent emitter

Enable system tray and updater plugin; restrict permissions.