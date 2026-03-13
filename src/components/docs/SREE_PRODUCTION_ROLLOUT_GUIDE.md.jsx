# Production Rollout Guide (Phase 7)

- Stage with all flags on, verbose telemetry.
- Canary rollout via SreeSettings or URL overrides (?sree=1, ?agentic=1).
- Rollback: disable Sree/Agentic in SreeSettings — widget falls back to Sri automatically.