# Sree Unified Widget Framework - Desktop Infrastructure

## Overview

This document describes the desktop infrastructure preparation completed in Phase-1 and Phase-2 of the Sree Unified Widget Framework migration. The framework is designed to support both web browser and desktop (Electron/Tauri) environments with a consistent API and seamless transitions.

---

## Desktop Detection Pattern

### Consistent Detection Function

All components use a unified desktop detection function from `@/components/utils/desktopContext.jsx`:

```javascript
export function isDesktopApp() {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.__TAURI__ || 
    window.electron || 
    window.process?.type === "renderer"
  );
}
```

### SSR Safety

**Critical**: All desktop detection must be wrapped in SSR-safe checks:

```javascript
// ✅ CORRECT - Check typeof window first
const isDesktopApp = typeof window !== 'undefined' && (
  window.__TAURI__ || 
  window.electron || 
  window.process?.type === 'renderer'
);

// ❌ WRONG - Direct window access causes SSR errors
const isDesktopApp = window.__TAURI__ || window.electron;
```

### Usage in useEffect

Window-dependent operations should always be inside `useEffect`:

```javascript
useEffect(() => {
  // Safe to use window APIs here
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  // ...
}, []);
```

---

## Widget State Management

### SreeWidgetManager States

The `SreeWidgetManager` component manages 4 distinct widget states:

```javascript
export const WIDGET_STATES = {
  EXPANDED: 'expanded',       // Full floating widget with chat/voice
  MINIMIZED: 'minimized',     // Small icon with TEXT CHAT button
  MINI_MONITOR: 'mini_monitor', // Desktop preview mode
  DEMO_MODE: 'demo_mode'      // Guided demo/kiosk mode
};
```

### State Transitions

**Valid Transitions:**
- `EXPANDED` ↔ `MINIMIZED` (user interaction)
- `MINI_MONITOR` ↔ `MINIMIZED` (demo mode toggle)
- Any state → `DEMO_MODE` (config-driven)

**Invalid Transitions:**
- Direct `DEMO_MODE` → `EXPANDED` (must go through minimized)
- `MINI_MONITOR` → `EXPANDED` without user action

### Auto-Detection Logic

```javascript
useEffect(() => {
  // Priority order:
  // 1. User-specified initialState
  if (initialState) return;
  
  // 2. Config flags (demo/kiosk mode)
  if (config.demoMode || config.kioskMode) {
    setWidgetState(WIDGET_STATES.DEMO_MODE);
    return;
  }
  
  // 3. Mini monitor mode (Aevathon context)
  if (config.miniMonitorMode || window.__SREE_FLAGS__?.enableMiniMonitor) {
    setWidgetState(WIDGET_STATES.MINI_MONITOR);
    return;
  }
  
  // 4. Desktop app defaults to expanded
  if (isDesktopApp) {
    setWidgetState(WIDGET_STATES.EXPANDED);
    return;
  }
  
  // 5. Default: start minimized on web
  setWidgetState(config.startMinimized ? WIDGET_STATES.MINIMIZED : WIDGET_STATES.EXPANDED);
}, []);
```

---

## Component Props Normalization

### Standard Props Interface

All Sree widgets now accept a consistent props interface:

```typescript
interface SreeWidgetProps {
  // Identity
  agentId?: string;
  clientId?: string;
  
  // State control
  enabled?: boolean;
  initialState?: 'expanded' | 'minimized' | 'mini_monitor' | 'demo_mode';
  
  // Callbacks
  onClose?: () => void;
  
  // Configuration
  config?: {
    // Display
    title?: string;
    avatarUrl?: string;
    greetingMessage?: string;
    
    // Behavior
    startMinimized?: boolean;
    demoMode?: boolean;
    kioskMode?: boolean;
    miniMonitorMode?: boolean;
    allowClose?: boolean;
    autoPlayDemo?: boolean;
    
    // Features
    enableVoice?: boolean;
    lang?: string;
  };
}
```

### Usage Examples

```javascript
// Basic web widget
<SreeFloatingWidget
  agentId="agent_123"
  clientId="client_456"
  config={{ enableVoice: true }}
/>

// Desktop widget with custom state
<SreeWidgetManager
  agentId="agent_123"
  clientId="client_456"
  initialState="expanded"
  config={{
    title: "Sree Assistant",
    avatarUrl: "https://...",
    allowClose: true
  }}
/>

// Demo/kiosk mode
<SreeWidgetManager
  agentId="agent_123"
  config={{
    demoMode: true,
    autoPlayDemo: true,
    allowClose: false
  }}
/>
```

---

## Desktop API Integration

### Unified Desktop API

The `getDesktopAPI()` function provides a consistent interface for desktop features:

```javascript
export function getDesktopAPI() {
  if (typeof window === "undefined") return null;
  
  return {
    // Screen context (for guided assistance)
    async getScreenContext() {
      if (window.electron?.getScreenContext) 
        return await window.electron.getScreenContext();
      if (window.__TAURI__?.invoke) 
        return await window.__TAURI__.invoke("get_screen_context");
      return null;
    },
    
    // Screen capture
    async captureScreen() {
      if (window.electron?.captureScreen) 
        return await window.electron.captureScreen();
      if (window.__TAURI__?.invoke) 
        return await window.__TAURI__.invoke("capture_screen");
      return null;
    },
    
    // Voice API placeholders
    async startMic() { 
      return await window.electron?.startMic?.(); 
    },
    async stopMic() { 
      return await window.electron?.stopMic?.(); 
    },
  };
}
```

### Browser Fallback Pattern

For features not available in desktop apps, provide browser fallbacks:

```javascript
const captureScreen = async () => {
  const desktop = isDesktopApp();
  
  if (desktop) {
    // Desktop native API
    const api = getDesktopAPI();
    const screenshot = await api.captureScreen();
    setScreenPreview(screenshot);
  } else {
    // Browser Screen Capture API
    if (navigator.mediaDevices?.getDisplayMedia) {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      // Capture frame from stream
      // ...
    }
  }
};
```

---

## Component Responsibilities

### SreeFloatingWidget
**Purpose**: Core draggable chat widget with voice support

**Features**:
- Draggable positioning anywhere on screen
- Voice and text input modes
- Minimize to icon with "TEXT CHAT" button
- Streaming chat responses
- Position persistence via localStorage

**Desktop Integration**:
- Works in both web and desktop contexts
- No desktop-specific features (pure widget)

---

### SreeMiniMonitor
**Purpose**: Desktop preview mode with screen sharing

**Features**:
- Screen preview display
- Guided tour functionality
- Draggable container
- Mini chat interface
- Demo content support

**Desktop Integration**:
- Uses `isDesktopApp()` to enable screen capture
- Provides browser fallback with Screen Capture API
- Integrates with Base44 for knowledge retrieval

---

### SreeDesktopAgent
**Purpose**: AI-powered desktop task guidance

**Features**:
- Workflow step-by-step guidance
- Screen context awareness (desktop only)
- Progress tracking
- Context-aware suggestions
- Multiple predefined workflows

**Desktop Integration**:
- Requires desktop context via `useDesktopContext` hook
- Displays "DESKTOP" badge when in desktop mode
- Shows screen context (current app, screen name)
- Polls for context updates every 3 seconds

---

### SreeWidgetManager
**Purpose**: Master widget state coordinator

**Features**:
- Manages all 4 widget states
- Auto-detects appropriate initial state
- Routes to correct widget component
- Handles widget lifecycle

**Desktop Integration**:
- Detects desktop app environment
- Auto-selects appropriate widget for context
- Passes desktop-specific config to child widgets

---

## useDesktopContext Hook

### Purpose
Provides reactive desktop context information to components.

### Usage

```javascript
import useDesktopContext from '@/components/hooks/useDesktopContext';

function MyComponent() {
  const { isDesktopApp, contextInfo } = useDesktopContext({
    pollIntervalMs: 3000 // optional, defaults to 3000
  });
  
  if (isDesktopApp) {
    console.log('Current app:', contextInfo.currentApp);
    console.log('Current screen:', contextInfo.currentScreen);
    console.log('AI suggestion:', contextInfo.suggestion);
  }
}
```

### Context Info Structure

```typescript
interface DesktopContextInfo {
  currentApp: string;      // e.g., "AEVOICE Dashboard"
  currentScreen: string;   // e.g., "Agent Builder"
  suggestion: string;      // e.g., "Click 'New Agent' to get started"
}
```

---

## Future Desktop Features (Phase-3+)

### Planned Electron APIs
- `window.electron.openExternal(url)` - Open links in default browser
- `window.electron.showNotification(options)` - Native notifications
- `window.electron.setTrayMenu(items)` - System tray integration
- `window.electron.saveFile(data, filename)` - Native file save dialog

### Planned Tauri APIs
- `window.__TAURI__.invoke('open_external', { url })` - External links
- `window.__TAURI__.invoke('show_notification', { title, body })` - Notifications
- `window.__TAURI__.invoke('save_file', { data, filename })` - File operations

### Voice Integration
- Desktop microphone access via native APIs
- Push-to-talk support
- Background voice activation
- Audio device selection

---

## Testing Checklist

### Web Browser Testing
- [ ] Widget renders correctly in all states
- [ ] No SSR errors in console
- [ ] Drag-and-drop works smoothly
- [ ] Voice input works (with browser permission)
- [ ] Screen capture falls back to browser API
- [ ] State transitions are valid
- [ ] localStorage position saves/restores

### Desktop App Testing (Electron)
- [ ] Desktop detection works (isDesktopApp returns true)
- [ ] Screen context updates correctly
- [ ] Native screen capture works
- [ ] Desktop API calls don't throw errors
- [ ] Widget positioning works within app bounds
- [ ] Context-aware suggestions appear

### Desktop App Testing (Tauri)
- [ ] Desktop detection works (__TAURI__ detected)
- [ ] Tauri invoke commands work
- [ ] Screen capture via Tauri API
- [ ] No CORS issues with API calls

---

## Common Pitfalls

### ❌ DON'T: Access window directly in module scope
```javascript
// BAD - causes SSR errors
const isDesktop = window.electron !== undefined;
```

### ✅ DO: Check typeof window first
```javascript
// GOOD - SSR safe
const isDesktop = typeof window !== 'undefined' && window.electron !== undefined;
```

---

### ❌ DON'T: Use desktop APIs without checking availability
```javascript
// BAD - throws error in browser
const context = await window.electron.getScreenContext();
```

### ✅ DO: Use the unified API with null checks
```javascript
// GOOD - handles both desktop and browser
const api = getDesktopAPI();
const context = await api?.getScreenContext();
if (context) {
  // Use context
}
```

---

### ❌ DON'T: Create undefined state transitions
```javascript
// BAD - skips valid intermediate states
setWidgetState('demo_mode');
setWidgetState('expanded'); // Invalid direct transition
```

### ✅ DO: Follow defined transition paths
```javascript
// GOOD - goes through minimized state
setWidgetState('demo_mode');
setWidgetState('minimized');
setWidgetState('expanded');
```

---

## Migration Notes

### Breaking Changes
**None** - All changes are additive. Existing web widget functionality remains unchanged.

### Deprecated Patterns
- **Direct window access in render**: Use useEffect hooks
- **Manual desktop detection**: Use `isDesktopApp()` from desktopContext
- **Inline desktop API calls**: Use `getDesktopAPI()` wrapper

### Recommended Upgrades
1. Replace inline desktop checks with `isDesktopApp()`
2. Use `useDesktopContext` hook for reactive context
3. Adopt standardized props interface
4. Use `SreeWidgetManager` for automatic state management

---

## File Reference

### Core Infrastructure Files
- `src/components/utils/desktopContext.jsx` - Desktop detection and API
- `src/components/hooks/useDesktopContext.jsx` - Reactive context hook
- `src/components/sree/SreeWidgetManager.jsx` - Master widget coordinator

### Widget Components
- `src/components/sree/SreeFloatingWidget.jsx` - Core draggable widget
- `src/components/sree/SreeMiniMonitor.jsx` - Preview/demo mode
- `src/components/sree/SreeDesktopAgent.jsx` - Task guidance agent
- `src/components/sree/SreeDemoMode.jsx` - Kiosk demo mode

### Shared Components
- `src/components/sree/SreeAvatar.jsx` - Avatar display component

---

## Phase-2 Implementation (January 2026)

### Desktop Runtime API Layer

**Status**: ✅ **COMPLETE**

The desktop runtime API layer has been fully implemented in `/src/desktop/`:

#### Core Modules

1. **`desktopBridge.js`** - Unified desktop API with runtime detection
   - Automatic Electron/Tauri/browser detection
   - Consistent interface across platforms
   - SSR-safe implementations
   - Error handling with console grouping

2. **`screenContext.js`** - Screen context awareness
   - `getScreenContextDesktop()` - Get current screen context
   - `pollScreenContext()` - Auto-polling with cleanup
   - `stopPollingScreenContext()` - Stop all polling
   - Default 3-second polling interval

3. **`screenCapture.js`** - Screen capture functionality
   - `captureScreenDesktop()` - Native desktop capture
   - `captureScreenBrowser()` - Browser Screen Capture API fallback
   - `captureScreen()` - Unified interface with auto-detection
   - Returns base64-encoded PNG images

4. **`voiceBridge.js`** - Voice input and recognition
   - `startMicDesktop()` / `stopMicDesktop()` - Desktop voice APIs
   - `startMicBrowser()` / `stopMicBrowser()` - Web Speech API fallback
   - `onVoiceData()` - Register voice data callbacks
   - `onVoiceError()` - Register error callbacks
   - `isRecordingVoice()` - Check recording status
   - `cleanupVoice()` - Cleanup all voice resources

5. **`notifications.js`** - Native notification support
   - `showNotification()` - Desktop + Web Notifications API
   - `requestNotificationPermission()` - Browser permission request
   - `isNotificationSupported()` - Feature detection
   - `isNotificationPermissionGranted()` - Permission check

6. **`systemTray.js`** - System tray integration (placeholder)
   - `setTrayMenu()` - Set tray menu items (Phase-3)
   - `showTray()` / `hideTray()` - Show/hide tray icon (Phase-3)

7. **`index.js`** - Main export module for convenient imports

---

### Widget Integration

All Sree widgets now use the unified desktop runtime API:

#### SreeDesktopAgent
- ✅ Uses `desktopBridge.isDesktop()` for runtime detection
- ✅ Uses `desktopBridge.pollScreenContext()` for 3-second polling
- ✅ Displays screen context (currentApp, currentScreen, suggestion)
- ✅ Shows "DESKTOP" badge when in desktop mode
- ✅ Auto-cleanup on component unmount

#### SreeMiniMonitor
- ✅ Uses `desktopBridge.captureScreen()` for screenshots
- ✅ Automatic fallback to browser Screen Capture API
- ✅ Simplified capture logic (no manual runtime checks)
- ✅ Error handling with user feedback

#### SreeWidgetManager
- ✅ Uses `desktopBridge.isDesktop()` for mode detection
- ✅ Added `desktopMode` state flag
- ✅ Auto-switches to MINI_MONITOR when desktop context active
- ✅ Auto-switches to EXPANDED on user interaction
- ✅ Passes `desktopMode` to child widgets
- ✅ Polls desktop context every 5 seconds for auto-switching

---

### API Reference

For complete API documentation, see **[DESKTOP_API_REFERENCE.md](./DESKTOP_API_REFERENCE.md)**

Quick reference:

```javascript
import desktopBridge from '@/desktop/desktopBridge.js';

// Runtime detection
const isDesktop = desktopBridge.isDesktop();
const runtime = desktopBridge.getRuntimeType(); // 'electron' | 'tauri' | 'browser'

// Screen context
const context = await desktopBridge.getScreenContext();
const cleanup = desktopBridge.pollScreenContext(callback, 3000);

// Screen capture
const screenshot = await desktopBridge.captureScreen();

// Voice
await desktopBridge.startMic();
await desktopBridge.stopMic();
const removeListener = desktopBridge.onVoiceData(callback);

// Notifications
await desktopBridge.showNotification({ title: 'Title', body: 'Body' });
```

---

### Testing Status

#### Build & Lint
- ✅ Build passes with no errors
- ✅ Lint passes with 0 errors
- ✅ No SSR warnings
- ✅ No breaking changes to web deployment

#### Manual Testing Required
- [ ] Test in Electron with real IPC handlers
- [ ] Test in Tauri with real commands
- [ ] Test voice recording in browser
- [ ] Test screen capture in browser
- [ ] Test widget auto-switching
- [ ] Verify notification permissions

---

## Questions & Support

For questions about the desktop infrastructure:
- Check this documentation first
- Review **DESKTOP_API_REFERENCE.md** for detailed API docs
- Review the component source code for implementation details
- Test in both web and desktop contexts before deployment

---

**Last Updated**: Phase-2 Completion (January 2026)
**Status**: ✅ **Production Ready (Web)**, 🚧 **Desktop APIs Ready for Integration (Phase-3)**
