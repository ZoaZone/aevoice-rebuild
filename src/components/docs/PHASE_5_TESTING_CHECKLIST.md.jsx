# Phase 5 Testing Checklist

## Browser
- LLM routing fallback works; Base44 → OpenAI → Gemini → Claude → message
- FloatingWidget banners for updates hidden on web
- MiniMonitor default flow renders; no "loading tour" unless empty
- Voice: browser Speech API path works/disabled gracefully
- Screen capture: error messaging if permission denied

## Desktop
- Detection true; auto-updater events flow to banner
- captureScreen stable; live preview smooth
- Mic start/stop; backoff on errors (manual verify)
- Context polling uses single emitter; no duplicate intervals

## Telemetry
- llmProviderUsed and llmError fire
- widgetStateTransition fires on minimize/expand

## Reliability
- ErrorBoundary shows web fallback banner on injected errors
- desktopBridge.recover() resets state without reload