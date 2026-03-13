import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

// Language detection based on speech patterns
const LANGUAGE_PATTERNS = {
  "en-US": /\b(hello|hi|hey|good morning|thank you|yes|no)\b/i,
  "es-ES": /\b(hola|buenos días|gracias|sí|no)\b/i,
  "fr-FR": /\b(bonjour|merci|oui|non|salut)\b/i,
  "de-DE": /\b(hallo|guten tag|danke|ja|nein)\b/i,
  "hi-IN": /\b(नमस्ते|धन्यवाद|हाँ|नहीं|namaste|dhanyavaad)\b/i,
  "te-IN": /\b(నమస్కారం|ధన్యవాదాలు|అవును|కాదు|namaskaram)\b/i,
  "ta-IN": /\b(வணக்கம்|நன்றி|ஆம்|இல்லை|vanakkam)\b/i,
  "pt-BR": /\b(olá|obrigado|sim|não|bom dia)\b/i,
  "it-IT": /\b(ciao|grazie|sì|no|buongiorno)\b/i,
  "ja-JP": /\b(こんにちは|ありがとう|はい|いいえ)\b/i,
  "zh-CN": /\b(你好|谢谢|是|不是)\b/i,
  "ar-SA": /\b(مرحبا|شكرا|نعم|لا)\b/i,
  "ko-KR": /\b(안녕하세요|감사합니다|네|아니요)\b/i,
};

function detectLanguageFromText(text, supportedLanguages) {
  if (!text || !supportedLanguages || supportedLanguages.length === 0) {
    return "en-US";
  }

  const scores = {};

  // Score each supported language
  for (const lang of supportedLanguages) {
    const pattern = LANGUAGE_PATTERNS[lang];
    if (pattern) {
      const matches = text.match(pattern);
      scores[lang] = matches ? matches.length : 0;
    }
  }

  // Return language with highest score, or default
  const detectedLang = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a, [
    "en-US",
    0,
  ])[0];

  return detectedLang;
}

function getVoiceForLanguage(language, voiceProvider) {
  // Map languages to appropriate voices
  const voiceMap = {
    "openai": {
      "en-US": "nova",
      "es-ES": "nova",
      "fr-FR": "shimmer",
      "de-DE": "onyx",
      "pt-BR": "nova",
      "hi-IN": "alloy",
      "te-IN": "alloy",
      "ta-IN": "alloy",
      "default": "nova",
    },
    "elevenlabs": {
      "en-US": "21m00Tcm4TlvDq8ikWAM", // Rachel
      "es-ES": "jBpfuIE2acCO8z3wKNLl", // Sofia
      "fr-FR": "pFZP5JQG7iQjIQuC4Bku", // Marie
      "hi-IN": "nPczCjzI2devNBz1zQrb", // Priya
      "te-IN": "nPczCjzI2devNBz1zQrb", // Priya
      "ta-IN": "nPczCjzI2devNBz1zQrb", // Priya
      "default": "21m00Tcm4TlvDq8ikWAM",
    },
  };

  const providerVoices = voiceMap[voiceProvider] || voiceMap["openai"];
  return providerVoices[language] || providerVoices["default"];
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Language detection request received", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);

    // Optional: validate user if needed
    // const user = await base44.auth.me();

    const { text, agent_id, call_session_id } = await req.json();

    if (!text || !agent_id) {
      return Response.json({
        error: "Missing required parameters: text, agent_id",
      }, { status: 400 });
    }

    // Get agent configuration
    const agents = await base44.asServiceRole.entities.Agent.filter({
      id: agent_id,
    });
    const agent = agents[0];

    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.auto_language_detection) {
      // Language detection disabled, use agent's default language
      return Response.json({
        detected_language: agent.language,
        voice_id: agent.voice_id,
        detection_method: "default",
      });
    }

    // Detect language from text
    const detectedLanguage = detectLanguageFromText(
      text,
      agent.supported_languages || ["en-US"],
    );

    // Get appropriate voice for detected language
    const voiceId = getVoiceForLanguage(detectedLanguage, agent.voice_provider);

    // Update call session with detected language if provided
    if (call_session_id) {
      try {
        await base44.asServiceRole.entities.CallSession.update(
          call_session_id,
          {
            extracted_data: {
              detected_language: detectedLanguage,
              language_changed: detectedLanguage !== agent.language,
            },
          },
        );
      } catch (err) {
        logger.warn("Could not update call session", {
          request_id: requestId,
          error: err.message,
        });
      }
    }

    logger.info("Language detected", {
      request_id: requestId,
      agent_id,
      detected_language: detectedLanguage,
    });

    return Response.json({
      detected_language: detectedLanguage,
      voice_id: voiceId,
      detection_method: "pattern_matching",
      confidence: 0.85,
      agent_supports_language: agent.supported_languages?.includes(detectedLanguage) || false,
    });
  } catch (error) {
    logger.error("Language detection failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
