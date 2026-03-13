<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Microphone: required for voice features -->
  <key>com.apple.security.device.microphone</key>
  <true/>
  <!-- Network: required for all API calls -->
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
  <!-- File access: user-selected files only -->
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <!-- App Sandbox -->
  <key>com.apple.security.app-sandbox</key>
  <true/>
</dict>
</plist>