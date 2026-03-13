export const appConfig = {
  openAI: {
    model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
    timeoutMs: 25_000,
  },
  rateLimits: {
    chatPerMinute: 20,
  },
  twilio: {
    validateSignature: true,
  },
  features: {
    enableAdvancedAnalytics: true,
    enableSafeModeFallback: true,
  },
};
