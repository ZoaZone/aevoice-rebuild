{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/master/tooling/cli/schema.json",
  "package": {
    "productName": "AEVOICE",
    "version": "1.0.0"
  },
  "build": {
    "beforeBuildCommand": "",
    "beforeDevCommand": "",
    "frontendDist": "",
    "devPath": "http://localhost:5173",
    "distDir": "../dist",
    "withGlobalTauri": true
  },
  "tauri": {
    "allowlist": {
      "all": true,
      "shell": {
        "all": true
      },
      "updater": {
        "active": true
      },
      "globalShortcut": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "ai.aevoice.desktop",
      "icon": ["icons/icon.icns", "icons/icon.ico"],
      "macOS": {
        "entitlements": "src-tauri/macos/entitlements.plist",
        "exceptionDomain": "*",
        "signingIdentity": null,
        "minimumSystemVersion": "10.15",
        "frameworks": [],
        "infoPlist": {
          "NSMicrophoneUsageDescription": "AEVOICE requires microphone access for push-to-talk and live voice.",
          "NSCameraUsageDescription": "AEVOICE may request camera for future features (not required)."
        }
      },
      "windows": {
        "webviewInstallMode": {
          "type": "downloadBootstrapper"
        }
      }
    },
    "updater": {
      "active": true,
      "endpoints": ["https://updates.aevoice.ai/tauri/appcast.json"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    },
    "windows": [
      {
        "label": "main",
        "title": "AEVOICE",
        "fullscreen": false,
        "resizable": true,
        "width": 1200,
        "height": 800
      }
    ]
  }
}