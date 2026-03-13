# Offline Mode Reference

Offline LLM fallback lives in components/llm/offlineEngine.js.
- loadModel(opts): loads a lightweight local model (placeholder) and emits telemetry `offlineModelLoaded`.
- runOfflineLLM(prompt): returns heuristic local response and emits `offlineInferenceUsed`.
- unloadModel(): releases resources.

Routing: components/llm/llmRouter.jsx tries Base44 → OpenAI → Gemini → Claude → Offline.