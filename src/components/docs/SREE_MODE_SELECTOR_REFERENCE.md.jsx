# Sree Mode Selector Reference

The `SreeModeSelector` component provides a dropdown interface for switching between assistant modes with automatic backend persistence and telemetry tracking.

## Props

```typescript
interface SreeModeSelectorProps {
  mode: string;                     // Current mode ('Sri', 'Sree', 'Text Chat', 'Voice Chat', 'Agentic Sree')
  onChange: (mode: string) => void; // Callback when mode changes
  disabledOptions?: string[];       // Array of modes to disable (grayed out)
  persistToBackend?: boolean;       // Enable backend persistence (default: false)
}
```

## Basic Usage

```jsx
import SreeModeSelector from '@/components/sree/SreeModeSelector';

function MyComponent() {
  const [mode, setMode] = useState('Sri');
  
  return (
    <SreeModeSelector 
      mode={mode} 
      onChange={setMode} 
    />
  );
}
```

## With Backend Persistence

```jsx
<SreeModeSelector 
  mode={mode} 
  onChange={setMode}
  persistToBackend={true}  // Saves to backend on change
/>
```

When `persistToBackend={true}`:
- On mount: Loads saved mode from backend via `GET /functions/getAssistantMode`
- On change: Persists selected mode via `POST /functions/setAssistantMode`
- Automatically updates parent via `onChange` callback

## With Disabled Options

```jsx
const disabledModes = ['Sree', 'Agentic Sree'];

<SreeModeSelector 
  mode={mode} 
  onChange={setMode}
  disabledOptions={disabledModes}
/>
```

Disabled modes appear grayed out in the dropdown and cannot be selected.

## Integration with Feature Flags

The unified widget automatically disables modes based on feature flags:

```jsx
// Inside SreeUnifiedWidget.jsx
const disabled = useMemo(() => {
  if (!flags) return [];
  const dis = [];
  if (!flags.enableSree) dis.push('Sree');
  if (!flags.enableText) dis.push('Text Chat');
  if (!flags.enableVoice) dis.push('Voice Chat');
  if (!flags.enableAgentic) dis.push('Agentic Sree');
  return dis;
}, [flags]);
```

## Telemetry Events

The component emits analytics events:

### `assistantModeChanged`
Fired every time the mode changes, whether through user interaction or programmatic change.

```javascript
{
  eventName: 'assistantModeChanged',
  properties: {
    mode: 'Agentic Sree'  // Selected mode
  }
}
```

## Backend API Integration

### Load Mode on Mount

When `persistToBackend={true}`, the component calls:

```typescript
GET /functions/getAssistantMode
Response: {
  success: true,
  mode: 'Sri'  // Saved mode or default
}
```

### Save Mode on Change

When user selects a new mode:

```typescript
POST /functions/setAssistantMode
Body: {
  mode: 'Sree'  // Selected mode
}
Response: {
  success: true,
  mode: 'Sree'
}
```

## Valid Modes

The selector supports these modes:

1. **Sri** - Simple text assistant (default)
2. **Sree** - Advanced assistant with voice and KB
3. **Text Chat** - Text-only with KB retrieval
4. **Voice Chat** - Voice-only with KB retrieval
5. **Agentic Sree** - Full agentic mode with overlay and context

## Styling

The component uses Radix UI Select components with Tailwind styling:

```jsx
<Select value={mode} onValueChange={handleChange}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Choose mode" />
  </SelectTrigger>
  <SelectContent>
    {/* Options... */}
  </SelectContent>
</Select>
```

## Complete Example

```jsx
import { useState, useEffect } from 'react';
import SreeModeSelector from '@/components/sree/SreeModeSelector';
import { loadFeatureFlags } from '@/components/config/featureFlags';

function AssistantControl() {
  const [mode, setMode] = useState('Sri');
  const [disabledModes, setDisabledModes] = useState([]);
  
  useEffect(() => {
    // Load feature flags and disable modes accordingly
    (async () => {
      const flags = await loadFeatureFlags();
      const disabled = [];
      if (!flags.enableSree) disabled.push('Sree');
      if (!flags.enableText) disabled.push('Text Chat');
      if (!flags.enableVoice) disabled.push('Voice Chat');
      if (!flags.enableAgentic) disabled.push('Agentic Sree');
      setDisabledModes(disabled);
    })();
  }, []);
  
  const handleModeChange = (newMode) => {
    console.log('Mode changed to:', newMode);
    setMode(newMode);
    
    // Apply mode-specific logic here
    switch(newMode) {
      case 'Sri':
        // Disable voice, KB, hotword
        break;
      case 'Sree':
        // Enable voice, KB, hotword
        break;
      case 'Agentic Sree':
        // Enable all features + overlay
        break;
    }
  };
  
  return (
    <div>
      <h2>Select Assistant Mode</h2>
      <SreeModeSelector
        mode={mode}
        onChange={handleModeChange}
        disabledOptions={disabledModes}
        persistToBackend={true}
      />
      <p>Current mode: {mode}</p>
    </div>
  );
}
```

## Debug & Testing

Test the mode selector in browser console:

```javascript
// Check current saved mode
await window.sreeDebug.mode()

// View all feature flags
await window.sreeDebug.flags()

// Check widget state
await window.sreeDebug.widget()
```

## Error Handling

The component handles errors gracefully:

- **Backend unavailable:** Falls back to local state only
- **Invalid mode returned:** Ignores and uses current mode
- **Save failure:** Logs error but continues with local state

All errors are logged when `window.SREE_DEBUG = true`.

## Best Practices

1. **Always use with feature flags** to disable unavailable modes
2. **Enable backend persistence** in production widgets
3. **Disable persistence** for preview/showcase components
4. **Test mode changes** with debug utilities
5. **Monitor telemetry events** to track user behavior