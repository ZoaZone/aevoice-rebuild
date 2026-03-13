# Desktop Telemetry Reference

Event names:
- desktopDetectionOutcome: { desktop: boolean, host?: string }
- screenCaptureSuccess: { mode: 'snapshot'|'live', width?: number, height?: number }
- screenCaptureError: { reason: string }
- voiceStart/voiceStop: { runtime: 'web'|'desktop' }
- voiceError: { runtime, error }
- llmProviderUsed: { provider: 'base44'|'openai'|'gemini'|'claude' }
- llmError: { provider, error }
- widgetStateTransition: { from, to }
- updateAvailable/updateInstalled: { version?: string }
- performanceMetrics: { memoryMB?: number, cpu?: number }

Transport batches every 5s; retries on failure.