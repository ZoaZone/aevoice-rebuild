# Sree Widget - Advanced Features Documentation

## Overview

The enhanced Sree widget now supports **4 distinct modes** providing different experiences for various use cases:

1. **EXPANDED** - Full floating widget with chat/voice
2. **MINIMIZED** - Small icon with TEXT CHAT button
3. **MINI_MONITOR** - Desktop preview mode with guided tours
4. **DEMO_MODE** - Interactive demo/kiosk mode

---

## New Components

### 1. SreeFloatingWidget

A truly floating, draggable widget that can be positioned anywhere on the screen.

**Features:**
- ✅ Draggable positioning (saves position to localStorage)
- ✅ Minimize to icon with TEXT CHAT button
- ✅ Voice and text chat modes
- ✅ Streaming responses
- ✅ Smooth animations

**Usage:**
```jsx
import SreeFloatingWidget from '@/components/sree/SreeFloatingWidget';

<SreeFloatingWidget
  agentId="your-agent-id"
  clientId="your-client-id"
  config={{
    greetingMessage: "Hi! I'm Sree. How can I help you today? 👋",
    enableVoice: true,
    primaryColor: '#0e4166'
  }}
  initialState="expanded" // or "minimized"
/>
```

### 2. SreeDemoMode

Interactive demo/kiosk mode for showcasing Sree capabilities.

**Features:**
- ✅ Auto-guided tour through 6 demo scenarios
- ✅ Kiosk mode with auto-play
- ✅ Navigation controls (play, pause, next, previous)
- ✅ Progress tracking
- ✅ Full-screen presentation mode

**Demo Scenarios:**
1. Welcome to Sree
2. Voice Conversation
3. Smart Lead Capture
4. Appointment Booking
5. E-commerce Assistant
6. Desktop Multi-Tasker

**Usage:**
```jsx
import SreeDemoMode from '@/components/sree/SreeDemoMode';

// Standard demo mode
<SreeDemoMode
  onClose={() => console.log('Demo closed')}
  autoPlay={true}
/>

// Kiosk mode (for exhibitions)
<SreeDemoMode
  kioskMode={true}
  autoPlay={true}
/>
```

### 3. SreeDesktopAgent

Desktop AI agent that provides guided assistance for complex workflows.

**Features:**
- ✅ Screen context awareness (when running in Electron/Tauri)
- ✅ Step-by-step task guidance
- ✅ Progress tracking with completion states
- ✅ Multiple pre-defined workflows
- ✅ Context-aware suggestions

**Built-in Workflows:**
1. Getting Started with Sree
2. Creating a New Agent
3. Building Your Knowledge Base

**Usage:**
```jsx
import SreeDesktopAgent from '@/components/sree/SreeDesktopAgent';

<SreeDesktopAgent
  workflowId="onboarding"
  config={{
    avatarUrl: "custom-avatar-url"
  }}
/>
```

### 4. SreeMiniMonitor

Enhanced mini monitor with screen preview capabilities.

**Features:**
- ✅ Screen capture preview (web & desktop)
- ✅ Draggable positioning
- ✅ Demo flow integration
- ✅ Minimizable with text chat
- ✅ Knowledge base integration

**Usage:**
```jsx
import SreeMiniMonitor from '@/components/sree/SreeMiniMonitor';

// Demo mode
<SreeMiniMonitor enabled={true} mode="demo" />

// Monitor mode (for desktop apps)
<SreeMiniMonitor enabled={true} mode="monitor" />
```

### 5. SreeWidgetManager

Central manager that orchestrates widget states and auto-detects the appropriate mode.

**Features:**
- ✅ Auto-detection of desktop context
- ✅ Manages 4 widget states
- ✅ Configuration-based mode selection
- ✅ Seamless switching between modes

**Usage:**
```jsx
import SreeWidgetManager, { WIDGET_STATES } from '@/components/sree/SreeWidgetManager';

<SreeWidgetManager
  agentId="your-agent-id"
  clientId="your-client-id"
  config={{
    demoMode: false,
    miniMonitorMode: false,
    startMinimized: false,
    enableVoice: true
  }}
  initialState={WIDGET_STATES.EXPANDED}
/>
```

---

## Widget Configuration

### Basic Configuration

```javascript
window.aevoiceConfig = {
  // Widget appearance
  greetingMessage: "Hi! I'm Sree. How can I help you today? 👋",
  avatarUrl: "https://your-avatar-url.jpg",
  buttonText: "Sree",
  primaryColor: "#0e4166",
  
  // Widget behavior
  enableVoice: true,
  openOnLoad: false,
  startMinimized: false,
  
  // Widget mode selection
  widgetMode: "floating", // "floating", "demo", "monitor"
  demoMode: false,
  kioskMode: false,
  miniMonitorMode: false,
  
  // Positioning
  position: "bottom-right",
  offsetX: 0,
  offsetY: 0,
  
  // Size
  panelWidth: 380,
  panelHeight: 560,
  
  // Advanced
  lang: "en-US",
  proactiveGreeting: false,
  showAfterSeconds: 5
};
```

### Mode-Specific Configuration

#### Floating Widget Mode
```javascript
window.aevoiceConfig = {
  widgetMode: "floating",
  startMinimized: true, // Start as small icon with TEXT CHAT button
  enableVoice: true
};
```

#### Demo/Kiosk Mode
```javascript
window.aevoiceConfig = {
  widgetMode: "demo",
  kioskMode: true, // Auto-play enabled
  autoPlayDemo: true
};
```

#### Mini Monitor Mode
```javascript
window.aevoiceConfig = {
  widgetMode: "monitor",
  miniMonitorMode: true
};
```

---

## Widget Embed Code

### Standard Embed

```html
<script
  src="https://your-domain.com/api/apps/YOUR_APP_ID/functions/widgetLoader"
  data-agent-id="YOUR_AGENT_ID"
  data-client-id="YOUR_CLIENT_ID"
  defer
></script>
```

### With Configuration

```html
<script>
  window.aevoiceConfig = {
    widgetMode: "floating",
    startMinimized: false,
    enableVoice: true,
    primaryColor: "#0e4166"
  };
</script>
<script
  src="https://your-domain.com/api/apps/YOUR_APP_ID/functions/widgetLoader"
  data-agent-id="YOUR_AGENT_ID"
  data-client-id="YOUR_CLIENT_ID"
  defer
></script>
```

### Demo Mode Embed

```html
<script>
  window.aevoiceConfig = {
    widgetMode: "demo",
    kioskMode: true,
    autoPlayDemo: true
  };
</script>
<script
  src="https://your-domain.com/api/apps/YOUR_APP_ID/functions/widgetLoader"
  data-agent-id="YOUR_AGENT_ID"
  defer
></script>
```

---

## Desktop App Integration

### Electron Integration

```javascript
// In your Electron main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  getScreenContext: () => ipcRenderer.invoke('get-screen-context')
});

// In your renderer process, the widget will automatically detect:
const isDesktopApp = window.electron;
```

### Tauri Integration

```rust
// In your Tauri command
#[tauri::command]
async fn capture_screen() -> Result<String, String> {
  // Capture screen implementation
}

#[tauri::command]
async fn get_screen_context() -> Result<ScreenContext, String> {
  // Get screen context implementation
}
```

```javascript
// In your web app, the widget will automatically detect:
const isDesktopApp = window.__TAURI__;
```

---

## Widget States

### EXPANDED
- Full chat interface
- Voice and text input
- Message history
- Draggable positioning

### MINIMIZED
- Small Sree avatar icon
- TEXT CHAT button for quick access
- Minimal screen space
- Click to expand

### MINI_MONITOR
- Screen preview window
- Demo flow steps
- Draggable positioning
- Chat integration

### DEMO_MODE
- Full-screen presentation
- Auto-guided tour
- Navigation controls
- Multiple scenarios

---

## CSS Animations

The widget includes smooth animations for:

- `sree-fade-in` - Fade in on load
- `sree-float-in` - Float in with scale effect
- `sree-minimize` - Minimize animation
- `sree-expand` - Expand animation
- `sree-pulse` - Pulse for listening state
- `sree-bounce` - Bounce for new messages
- `sree-shimmer` - Shimmer effect for demo mode
- `sree-typing` - Typing indicator animation

All animations use CSS classes and can be customized via your CSS.

---

## API Reference

### SreeFloatingWidget Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `agentId` | string | required | Agent ID for chat API |
| `clientId` | string | optional | Client ID for tracking |
| `config` | object | `{}` | Widget configuration |
| `onClose` | function | optional | Callback when widget closes |
| `initialState` | string | `'expanded'` | Initial widget state |

### SreeDemoMode Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClose` | function | optional | Callback when demo closes |
| `autoPlay` | boolean | `true` | Auto-advance scenarios |
| `kioskMode` | boolean | `false` | Kiosk mode with auto-play |
| `config` | object | `{}` | Configuration options |

### SreeDesktopAgent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | object | `{}` | Configuration options |
| `workflowId` | string | optional | Specific workflow to load |

### SreeMiniMonitor Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable monitor |
| `mode` | string | `'demo'` | Mode: 'demo' or 'monitor' |

### SreeWidgetManager Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `agentId` | string | required | Agent ID for chat API |
| `clientId` | string | optional | Client ID for tracking |
| `config` | object | `{}` | Widget configuration |
| `initialState` | string | auto-detect | Initial widget state |

---

## Testing

Run the comprehensive test suite:

```bash
# Test new components
npm run test test/widget/sreeNewComponents.test.ts

# Test all widget functionality
npm run test test/widget/

# Verify widget integration
npm run test:widget
```

Tests cover:
- Component existence
- Feature implementation
- Configuration options
- CSS animations
- Integration with WidgetHost
- Greeting messages
- Widget modes

---

## Browser Support

- **Chrome/Edge**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (voice may require permissions)
- **Mobile**: ✅ Responsive design

---

## Desktop App Support

- **Electron**: ✅ Full support (with native screen capture)
- **Tauri**: ✅ Full support (with native screen capture)
- **Web**: ✅ Fallback to web APIs

---

## Troubleshooting

### Widget not appearing
- Check `data-agent-id` attribute is set
- Verify widget script is loaded
- Check browser console for errors

### Voice not working
- Ensure HTTPS connection
- Check microphone permissions
- Verify browser supports Web Speech API

### Screen capture not working
- Desktop app: Verify Electron/Tauri APIs are exposed
- Web: Check `navigator.mediaDevices.getDisplayMedia` support
- Ensure user grants screen capture permission

### Demo mode not auto-playing
- Verify `kioskMode={true}` is set
- Check `autoPlay` prop is not disabled
- Ensure no JavaScript errors in console

---

## Examples

### Example 1: Basic Floating Widget

```html
<script>
  window.aevoiceConfig = {
    greetingMessage: "Hi! I'm Sree. How can I help you today? 👋",
    enableVoice: true
  };
</script>
<script
  src="https://aevathon.aevoice.ai/api/apps/692b24a5bac54e3067972063/functions/widgetLoader"
  data-agent-id="your-agent-id"
  defer
></script>
```

### Example 2: Demo Mode for Exhibition

```html
<script>
  window.aevoiceConfig = {
    widgetMode: "demo",
    kioskMode: true,
    autoPlayDemo: true
  };
</script>
<script
  src="https://aevathon.aevoice.ai/api/apps/692b24a5bac54e3067972063/functions/widgetLoader"
  data-agent-id="demo-agent"
  defer
></script>
```

### Example 3: Desktop App Integration

```javascript
// In your React app
import SreeWidgetManager from '@/components/sree/SreeWidgetManager';

function App() {
  return (
    <SreeWidgetManager
      agentId="your-agent-id"
      clientId="your-client-id"
      config={{
        enableVoice: true,
        startMinimized: false
      }}
    />
  );
}
```

---

## Migration Guide

### From Old Widget to New Widget

The new widget system is **backward compatible**. Existing widgets continue to work without changes.

To enable new features:

```javascript
// Old configuration (still works)
window.aevoiceConfig = {
  greetingMessage: "Hi! I'm Sri",
  enableVoice: true
};

// New configuration (recommended)
window.aevoiceConfig = {
  greetingMessage: "Hi! I'm Sree. How can I help you today? 👋",
  widgetMode: "floating", // Enable new widget system
  startMinimized: false,
  enableVoice: true
};
```

---

## Support

For questions or issues:
- Documentation: `/SREE_WIDGET_QUICK_TEST.md`
- Testing Guide: `/SREE_WIDGET_TESTING.md`
- Repository: https://github.com/ZoaZone/aevoice-ai

---

## Version History

### v2.0.0 (Current)
- ✅ Added SreeFloatingWidget with draggable positioning
- ✅ Added SreeDemoMode for interactive demos
- ✅ Added SreeDesktopAgent for guided workflows
- ✅ Enhanced SreeMiniMonitor with screen capture
- ✅ Added SreeWidgetManager for state orchestration
- ✅ Updated greeting: "Hi! I'm Sree. How can I help you today? 👋"
- ✅ Added CSS animations
- ✅ Desktop app support (Electron/Tauri)
- ✅ 4 widget states: EXPANDED, MINIMIZED, MINI_MONITOR, DEMO_MODE

### v1.0.0
- Basic chat widget functionality
- Voice support
- Knowledge base integration
