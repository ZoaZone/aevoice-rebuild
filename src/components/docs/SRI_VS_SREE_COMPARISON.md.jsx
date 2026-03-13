# Sri vs Sree - Assistant Mode Comparison

## Overview

AEVOICE AI offers multiple assistant modes, from lightweight text-only chat to full agentic automation. Each mode is optimized for specific use cases and has different capabilities.

## Feature Comparison Matrix

| Feature | Sri | Sree | Text Chat | Voice Chat | Agentic Sree |
|---------|-----|------|-----------|------------|--------------|
| **Text Chat** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Voice Input** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Voice Output** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Knowledge Retrieval** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Hotword Detection** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Screen Context** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Overlay Widget** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Agentic Actions** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Multi-Window** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Best For** | Simple queries | General assistance | Text-only help | Hands-free use | Automation & workflows |

## Mode Details

### 1. Sri (Simple Text Assistant)

**Purpose:** Lightweight text-only assistant for basic Q&A

**Capabilities:**
- Text chat interface
- Direct LLM responses
- Fast response times
- Minimal resource usage

**Use Cases:**
- Basic customer support
- Simple FAQ responses
- Lightweight tenants
- Resource-constrained environments

**Implementation:**
```javascript
modeConfig = {
  enableVoice: false,
  enableHotword: false,
  enableOverlay: false,
  enableKB: false,
  enableScreenContext: false,
  promptProfile: 'Sri'
}
```

### 2. Sree (Advanced Assistant)

**Purpose:** Full-featured assistant with voice and knowledge base

**Capabilities:**
- Text and voice chat
- Knowledge base retrieval
- Hotword activation ("Hey Sree")
- Lead capture
- Multi-language support
- Conversation context

**Use Cases:**
- Customer support with KB
- Voice-enabled assistance
- Lead generation
- Interactive help systems

**Implementation:**
```javascript
modeConfig = {
  enableVoice: true,
  enableHotword: true,
  enableOverlay: false,
  enableKB: true,
  enableScreenContext: false,
  promptProfile: 'Sree'
}
```

### 3. Text Chat Mode

**Purpose:** Text-only chat with knowledge base access

**Capabilities:**
- Text chat interface
- Knowledge base retrieval
- Conversation context
- No voice features

**Use Cases:**
- Chat-based support
- FAQ with KB search
- Text-only environments
- Accessibility (keyboard navigation)

**Implementation:**
```javascript
modeConfig = {
  enableVoice: false,
  enableHotword: false,
  enableOverlay: false,
  enableKB: true,
  enableScreenContext: false,
  promptProfile: 'Text Chat'
}
```

### 4. Voice Chat Mode

**Purpose:** Voice-only interaction with KB

**Capabilities:**
- Voice input via speech recognition
- Voice output via TTS
- Knowledge base retrieval
- No text chat UI
- Optimized for spoken responses

**Use Cases:**
- Hands-free operation
- Accessibility (screen readers)
- Voice-first experiences
- Mobile voice apps

**Implementation:**
```javascript
modeConfig = {
  enableVoice: true,
  enableHotword: false,
  enableOverlay: false,
  enableKB: true,
  enableScreenContext: false,
  promptProfile: 'Voice Chat'
}
```

### 5. Agentic Sree (Full Automation)

**Purpose:** Complete agentic assistant with context awareness

**Capabilities:**
- All Sree features
- Screen context awareness
- Hotword activation
- Overlay widget for suggestions
- Multi-window support (desktop)
- Agentic workflows
- Proactive assistance

**Use Cases:**
- Desktop automation
- Workflow assistance
- Context-aware help
- Proactive suggestions
- Screen-based guidance

**Implementation:**
```javascript
modeConfig = {
  enableVoice: true,
  enableHotword: true,
  enableOverlay: true,
  enableKB: true,
  enableScreenContext: true,
  promptProfile: 'Agentic Sree'
}
```

## Technical Differences

### LLM Routing

All modes use the unified LLM router with cascading fallback:
1. Base44 Core LLM
2. OpenAI (proxy)
3. Gemini (proxy)
4. Claude (proxy)
5. Offline model (if available)

Each mode uses a different prompt profile optimized for its use case.

### Knowledge Base Integration

Modes with KB enabled (`enableKB: true`) retrieve relevant context before LLM calls:

```javascript
// KB retrieval (when enabled)
const kbRes = await base44.functions.invoke('kbRetrieval', { 
  query: userInput, 
  limit: 6 
});
const context = chunks.map(c => c.content).join('\n').slice(0, 3000);
```

### Voice Integration

Modes with voice enabled use:
- **Input:** Web Speech API (browser) or desktop voice bridge
- **Output:** Speech Synthesis API or desktop TTS bridge
- **Hotword:** Custom energy-based detection with CPU throttling

### Screen Context (Agentic Mode Only)

Agentic mode polls screen context every 3 seconds:

```javascript
desktopBridge.pollScreenContext((ctx) => {
  // ctx.currentApp, ctx.currentScreen, ctx.suggestion
  setScreenContext(ctx);
}, 3000);
```

## Performance Characteristics

| Mode | Response Time | Resource Usage | Network Usage |
|------|--------------|----------------|---------------|
| Sri | ~1-2s | Very Low | Low |
| Sree | ~2-3s | Medium | Medium |
| Text Chat | ~2-3s | Low | Medium |
| Voice Chat | ~3-4s | Medium-High | Medium |
| Agentic Sree | ~2-4s | High | High |

## Backend Persistence

Mode selection is persisted per-tenant in the `SreeSettings` entity:

```sql
SELECT assistantMode FROM SreeSettings WHERE tenantId = ?
-- Returns: 'Sri' | 'Sree' | 'Text Chat' | 'Voice Chat' | 'Agentic Sree'
```

Users' mode preference is maintained across sessions and page reloads.

## Feature Flags

Modes can be disabled via feature flags:

```javascript
{
  enableSri: true,        // Always available
  enableSree: true,       // Sree mode
  enableText: true,       // Text Chat mode
  enableVoice: true,      // Voice Chat mode
  enableAgentic: false,   // Agentic Sree mode (enterprise only)
}
```

## Migration Guide

### From Old Architecture

The new unified architecture replaces separate components:

**Before (Phase 1-6):**
```jsx
// Separate components
<SriAssistant />
<SreeAssistant />
```

**After (Phase 7):**
```jsx
// Single unified widget
<SreeUnifiedWidget />
```

The widget automatically handles mode switching and applies correct configurations.

### Backward Compatibility

- Existing `SriAssistant` and `SreeAssistant` components still work
- New `SreeUnifiedWidget` is the recommended approach
- Mode persistence is opt-in via `persistToBackend` prop

## Decision Guide

**Choose Sri when:**
- Basic text Q&A is sufficient
- Minimal resource usage is important
- No voice or KB needed
- Serving lightweight tenants

**Choose Sree when:**
- Need voice interaction
- KB retrieval is important
- Hotword activation desired
- General-purpose assistance

**Choose Text Chat when:**
- Text-only environment
- KB access needed
- Voice not desired
- Keyboard-friendly

**Choose Voice Chat when:**
- Hands-free operation required
- Accessibility priority
- Voice-first experience
- Mobile voice apps

**Choose Agentic Sree when:**
- Desktop automation needed
- Context awareness required
- Proactive assistance wanted
- Workflow integration
- Screen-based guidance

## Telemetry & Analytics

Track mode usage with these events:

```javascript
// Mode changes
trackEvent('assistantModeChanged', { mode: 'Sree' });

// Mode config applied
trackEvent('widgetModeApplied', { mode: 'Agentic Sree', config: {...} });

// Agentic mode activation
trackEvent('agenticModeEnabled');
```

Analyze mode distribution with:
```javascript
await window.sreeDebug.mode()  // Current mode
await window.sreeDebug.flags() // Feature flags
```

## Pricing Implications

| Mode | Cost Factor | Explanation |
|------|-------------|-------------|
| Sri | 1x | Base LLM only |
| Sree | 1.5x | LLM + KB + Voice |
| Text Chat | 1.2x | LLM + KB |
| Voice Chat | 1.5x | LLM + KB + Voice |
| Agentic Sree | 2x | All features + Context polling |

Cost tracking is automatic per conversation. See cost breakdown in usage dashboard.