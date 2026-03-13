{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "AEVOICE",
  "version": "1.0.0",
  "identifier": "com.aevoice.desktop",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "label": "main",
        "title": "AEVOICE AI",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
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
      "csp": "default-src 'self'; connect-src 'self' https://*.supabase.co https://*.base44.com https://api.openai.com https://api.elevenlabs.io https://api.stripe.com https://api.twilio.com wss://*.supabase.co wss://*.base44.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' blob: https:;"
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
    "longDescription": "AEVOICE AI - Professional Voice AI and Telephony Platform Desktop Application",
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
      },
      "rpm": {
        "depends": ["webkit2gtk4.1", "gtk3", "libappindicator-gtk3"]
      }
    }
  }
}