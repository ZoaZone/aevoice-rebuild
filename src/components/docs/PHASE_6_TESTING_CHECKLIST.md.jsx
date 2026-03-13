# Phase 6 Testing Checklist

- Hotword: say "Hey Sree" near mic → MiniMonitor pulses, mic starts.
- Overlay: press Ctrl+Space → overlay appears, hides after 5s.
- Offline LLM: temporarily disconnect network; ask question in widget → receives offline response.
- Watchdog: stop screen/voice/hotword events for > thresholds → auto recovery triggers.
- Admin Dashboard: Sree Plans tab visible and loads.
- MiniMonitor: Screen capture returns preview (desktop or browser getDisplayMedia).