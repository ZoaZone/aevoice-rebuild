# Sree Unified Assistant Guide (Phase 7)

This guide explains the unified Sri/Sree architecture and how to use the new widget and feature flags.

## Components

- **components/sree/SreeUnifiedWidget.jsx**: Single widget with five modes and automatic mode-specific configuration
- **components/sree/SreeModeSelector.jsx**: Dropdown to switch modes, persists to backend, emits telemetry
- **components/config/featureFlags.js**: Flags fetched from SreeSettings with query/local overrides
- **components/home/HomeAssistantShowcase.jsx**: Home page section showcasing Sri vs Sree with navigation

## Backend APIs

- **GET /functions/getAssistantMode**: Retrieves the saved assistant mode for the current tenant
- **POST /functions/setAssistantMode**: Persists the selected mode to SreeSettings entity

## Usage

### Basic Widget Mount
```jsx
import SreeUnifiedWidget from '@/components/sree/SreeUnifiedWidget';

<SreeUnifiedWidget />
```

The widget will:
1. Load feature flags from backend
2. Load saved mode from backend (via SreeModeSelector)
3. Apply mode-specific configuration automatically
4. Enable backend persistence for mode changes

### Mode Configurations

Each mode has a specific configuration that controls behavior:

**Sri Mode** (Simple Text Assistant)
- Voice: ❌ Disabled
- Hotword: ❌ Disabled
- Overlay: ❌ Disabled
- Knowledge Base: ❌ Disabled
- Screen Context: ❌ Disabled
- Use Case: Lightweight text-only chat

**Sree Mode** (Advanced Assistant)
- Voice: ✅ Enabled
- Hotword: ✅ Enabled
- Overlay: ❌ Disabled
- Knowledge Base: ✅ Enabled
- Screen Context: ❌ Disabled
- Use Case: Voice + KB retrieval for comprehensive assistance

**Text Chat Mode**
- Voice: ❌ Disabled
- Hotword: ❌ Disabled
- Overlay: ❌ Disabled
- Knowledge Base: ✅ Enabled
- Screen Context: ❌ Disabled
- Use Case: Chat UI with KB retrieval, no voice

**Voice Chat Mode**
- Voice: ✅ Enabled
- Hotword: ❌ Disabled
- Overlay: ❌ Disabled
- Knowledge Base: ✅ Enabled
- Screen Context: ❌ Disabled
- Use Case: Voice-only interaction with KB retrieval

**Agentic Sree Mode**
- Voice: ✅ Enabled
- Hotword: ✅ Enabled ("Hey Sree" activation)
- Overlay: ✅ Enabled (screen overlay widget)
- Knowledge Base: ✅ Enabled
- Screen Context: ✅ Enabled (polls every 3s)
- Use Case: Full agentic automation with context awareness

## Telemetry Events

The system tracks the following events:

- `assistantModeChanged` - Fired when user changes mode (from SreeModeSelector)
- `widgetModeApplied` - Fired when mode config is applied (from SreeUnifiedWidget)
- `showcaseModeSelected` - Fired when user selects mode in showcase (from HomeAssistantShowcase)
- `showcaseNavigateToDemo` - Fired when navigating to demo (from HomeAssistantShowcase)
- `agenticModeEnabled` - Fired when Agentic mode activates (from AgenticView)

## Debug Utilities

Use the global debug helpers in browser console:

```javascript
// Get current mode
await window.sreeDebug.mode()

// Get feature flags
await window.sreeDebug.flags()

// Get widget health status
await window.sreeDebug.widget()

// Get desktop bridge state
window.sreeDebug.desktop()

// Complete diagnostics
window.sreeDebug.dumpAll()
```

Enable debug mode for verbose logging:
```javascript
window.SREE_DEBUG = true;
```

## Architecture

### Mode Switching Flow

1. User selects mode in SreeModeSelector dropdown
2. `handleChange` fires `assistantModeChanged` telemetry event
3. If `persistToBackend=true`, calls `POST /functions/setAssistantMode`
4. Parent widget (SreeUnifiedWidget) receives mode change via `onChange`
5. Widget calculates new `modeConfig` based on mode
6. Widget fires `widgetModeApplied` telemetry event
7. Correct view component renders with config
8. View component applies behavior (voice, hotword, KB, etc.)

### Backend Persistence

The mode is stored in the `SreeSettings` entity with the `assistantMode` field:

```typescript
// SreeSettings entity
{
  tenantId: string,
  assistantMode: 'Sri' | 'Sree' | 'Text Chat' | 'Voice Chat' | 'Agentic Sree',
  enableSreeWeb: boolean,
  enableSreeDesktop: boolean,
  // ... other fields
}
```

### Feature Flags Integration

Feature flags can disable specific modes:

```javascript
{
  enableSree: false,      // Disables "Sree" mode
  enableText: false,      // Disables "Text Chat" mode
  enableVoice: false,     // Disables "Voice Chat" mode
  enableAgentic: false,   // Disables "Agentic Sree" mode
}
```

Disabled modes are shown as grayed out in the mode selector dropdown.

## View Components

### SriView
- Implements simple text chat with LLM router
- No voice, no KB, no special features
- Optimized for quick responses

### SreeView
- Reuses existing SreeAssistant component
- Full voice + KB + all features built-in
- Most comprehensive mode

### TextChatView
- Text chat with KB retrieval
- No voice capabilities
- Shows loading state

### VoiceChatView
- Voice-only interaction
- KB retrieval for context
- Displays transcription and response

### AgenticView
- Starts hotword detection on mount
- Polls screen context every 3s
- Shows overlay when enabled
- Displays feature status indicators
- Shows current screen context

## Home Showcase Integration

The HomeAssistantShowcase component now includes:

1. Mode selector for preview
2. "Try Now" button that:
   - Saves selected mode to backend
   - Navigates to `/sree-demo`
   - Fires telemetry events

Users can select a mode on the home page and immediately try it in the demo.

## Testing

To test the implementation:

1. **Mode Persistence:**
   ```javascript
   // Select a mode in the widget
   // Reload the page
   // Mode should be preserved
   await window.sreeDebug.mode() // Should show saved mode
   ```

2. **Mode Behaviors:**
   ```javascript
   // Switch to Sri mode - should disable all advanced features
   // Switch to Agentic mode - should enable hotword, overlay, screen context
   await window.sreeDebug.widget() // Check widget state
   ```

3. **Telemetry:**
   ```javascript
   // Change modes and check browser console for telemetry events
   // Should see assistantModeChanged, widgetModeApplied events
   ```

4. **Home Showcase:**
   - Navigate to home page
   - Select a mode
   - Click "Try Now"
   - Should navigate to /sree-demo with mode persisted

## Troubleshooting

### Mode not persisting
- Check `await window.sreeDebug.mode()` to verify backend persistence
- Ensure user is authenticated (mode is per-tenant)
- Check browser console for errors

### Mode behavior not applying
- Check `await window.sreeDebug.widget()` for widget state
- Verify feature flags with `await window.sreeDebug.flags()`
- Enable debug mode: `window.SREE_DEBUG = true`

### Voice/hotword not working
- Check `window.sreeDebug.voice()` for voice bridge state
- Check `window.sreeDebug.hotword()` for hotword detection state
- Verify microphone permissions in browser

### Screen context not updating
- Check `window.sreeDebug.desktop()` for desktop bridge state
- Verify running in desktop app context (not browser)
- Check if screen context polling is active in AgenticView