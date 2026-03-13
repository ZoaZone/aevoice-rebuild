<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Microphone access for voice features -->
  <key>com.apple.security.device.microphone</key>
  <true/>

  <!-- Camera access (optional, for future video features) -->
  <!-- <key>com.apple.security.device.camera</key> -->
  <!-- <true/> -->

  <!-- Network client access -->
  <key>com.apple.security.network.client</key>
  <true/>

  <!-- Network server access (for local IPC) -->
  <key>com.apple.security.network.server</key>
  <true/>

  <!-- Read user-selected files -->
  <key>com.apple.security.files.user-selected.read-only</key>
  <true/>

  <!-- Read/write user-selected files -->
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>

  <!-- Downloads folder read access -->
  <key>com.apple.security.files.downloads.read-write</key>
  <true/>

  <!-- Keychain access (placeholder - signing required for production) -->
  <!-- <key>keychain-access-groups</key> -->
  <!-- <array><string>$(AppIdentifierPrefix)com.aevoice.desktop</string></array> -->
</dict>
</plist>