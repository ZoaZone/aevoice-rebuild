{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "AEVOICE",
  "version": "1.0.0",
  "identifier": "com.aevoice.app",
  "build": {
    "beforeDevCommand": "cd ../frontend && npm run dev",
    "devUrl": "http://localhost:5173/app",
    "beforeBuildCommand": "cd ../frontend && npm run build",
    "frontendDist": "../frontend/dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "label": "main",
        "title": "AEVOICE AI",
        "width": 1280,
        "height": 820,
        "minWidth": 960,
        "minHeight": 640,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "decorations": true,
        "transparent": false,
        "alwaysOnTop": false,
        "visible": true,
        "focus": true,
        "url": "index.html"
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:3001 https://*.supabase.co https://*.base44.com https://api.openai.com https://api.elevenlabs.io wss://*.supabase.co wss://*.base44.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' blob: https:;"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [],
    "externalBin": [],
    "copyright": "© 2026 AEVOICE AI",
    "category": "Utility",
    "shortDescription": "AEVOICE AI Voice Assistant",
    "longDescription": "Professional Voice AI and Telephony Platform",
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "exceptionDomain": "",
      "signingIdentity": null,
      "providerShortName": null,
      "entitlements": "entitlements.plist"
    },
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0", "libgtk-3-0", "libayatana-appindicator3-1"]
      }
    }
  }
}