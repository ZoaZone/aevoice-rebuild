// functions/sttStream.js
// Speech-to-Text streaming endpoint using OpenAI Whisper
// Accepts audio chunks via POST and returns transcription

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import OpenAI from "npm:openai@4.28.0";
import { logger } from "./lib/infra/logger.js";
import { LatencyTracker } from "./lib/infra/latencyTracker.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const sttStartTime = Date.now();

  // Create latency tracker for STT timing
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

    const contentType = req.headers.get("content-type") || "";

    let audioBuffer;
    let language = "en";

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData with audio file
      const formData = await req.formData();
      const audioFile = formData.get("audio");
      language = formData.get("language") || "en";

      if (!audioFile) {
        return jsonError({ error: "Audio file is required" }, 400);
      }

      audioBuffer = await audioFile.arrayBuffer();
    } else if (contentType.includes("application/octet-stream")) {
      // Raw audio bytes
      audioBuffer = await req.arrayBuffer();
    } else if (contentType.includes("application/json")) {
      // Base64 encoded audio
      const body = await req.json();
      if (!body.audio_base64) {
        return jsonError({ error: "audio_base64 is required" }, 400);
      }
      language = body.language || "en";

      // Decode base64 to buffer
      const binaryString = atob(body.audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioBuffer = bytes.buffer;
    } else {
      return jsonError({ error: "Unsupported content type" }, 400);
    }

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return jsonError({ error: "Empty audio data" }, 400);
    }

    logger.info("STT request received", {
      request_id: requestId,
      audio_size: audioBuffer.byteLength,
      language,
    });

    // Create a File object for OpenAI
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
    const audioFileObj = new File([audioBlob], "audio.webm", {
      type: "audio/webm",
    });

    // Call OpenAI Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileObj,
      model: "whisper-1",
      language: language !== "auto" ? language : undefined,
      response_format: "json",
    });

    // Mark STT completion
    latencyTracker.markSttComplete();
    latencyTracker.logSummary();

    logger.info("STT transcription completed", {
      request_id: requestId,
      text_length: transcription.text?.length || 0,
      stt_latency_ms: Date.now() - sttStartTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        text: transcription.text,
        language: language,
        request_id: requestId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    logger.error("STT error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonError({
      error: error instanceof Error ? error.message : String(error) || "Transcription failed",
    }, 500);
  }
});

function jsonError(body, status = 400) {
  return new Response(JSON.stringify({ success: false, ...body }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
