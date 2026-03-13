// functions/ttsStream.js
// Text-to-Speech streaming endpoint using ElevenLabs or OpenAI TTS
// Returns audio stream for real-time playback

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";
import { LatencyTracker } from "./lib/infra/latencyTracker.ts";

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Default voice IDs
const DEFAULT_VOICES = {
  elevenlabs: "21m00Tcm4TlvDq8ikWAM", // Rachel
  openai: "alloy",
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const ttsStartTime = Date.now();

  // Create latency tracker for TTS timing
  const latencyTracker = new LatencyTracker(requestId, "sri"); // Can be sri or aeva

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonError({ error: "Method not allowed" }, 405);
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return jsonError({ error: "Authentication required" }, 401);
    }

    const body = await req.json();
    const {
      text,
      voice_id,
      provider = "elevenlabs", // "elevenlabs" or "openai"
      model = "eleven_monolingual_v1",
      speed = 1.0,
      stability = 0.5,
      similarity_boost = 0.75,
    } = body;

    if (!text || typeof text !== "string") {
      return jsonError({ error: "Text is required" }, 400);
    }

    if (text.length > 5000) {
      return jsonError({ error: "Text too long (max 5000 chars)" }, 400);
    }

    logger.info("TTS request received", {
      request_id: requestId,
      provider,
      text_length: text.length,
    });

    latencyTracker.markTtsStart(); // Mark TTS generation start

    if (provider === "elevenlabs" && ELEVENLABS_API_KEY) {
      return await streamElevenLabs({
        text,
        voiceId: voice_id || DEFAULT_VOICES.elevenlabs,
        model,
        stability,
        similarityBoost: similarity_boost,
        requestId,
        latencyTracker,
      });
    } else if (provider === "openai" || !ELEVENLABS_API_KEY) {
      return await streamOpenAI({
        text,
        voice: voice_id || DEFAULT_VOICES.openai,
        speed,
        requestId,
        latencyTracker,
      });
    } else {
      return jsonError({ error: "No TTS provider configured" }, 500);
    }
  } catch (error) {
    logger.error("TTS error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonError({
      error: error instanceof Error ? error.message : String(error) || "TTS failed",
    }, 500);
  }
});

async function streamElevenLabs(
  {
    text,
    voiceId,
    model,
    stability,
    similarityBoost,
    requestId,
    latencyTracker,
  },
) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("ElevenLabs API error", {
      request_id: requestId,
      error: errorText,
    });
    throw new Error("ElevenLabs TTS failed");
  }

  // Mark first chunk received
  latencyTracker.markTtsFirstChunk();
  latencyTracker.logSummary();

  logger.info("ElevenLabs TTS streaming started", { request_id: requestId });

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}

async function streamOpenAI({ 
  text, 
  voice, 
  speed, 
  requestId, 
  latencyTracker 
}: {
  text: string;
  voice: string;
  speed: number;
  requestId: string;
  latencyTracker: LatencyTracker;
}) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      speed,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("OpenAI TTS API error", {
      request_id: requestId,
      error: errorText,
    });
    throw new Error("OpenAI TTS failed");
  }

  // Mark first chunk received
  latencyTracker.markTtsFirstChunk();
  latencyTracker.logSummary();

  logger.info("OpenAI TTS streaming started", { request_id: requestId });

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}

function jsonError(body, status = 400) {
  return new Response(JSON.stringify({ success: false, ...body }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
