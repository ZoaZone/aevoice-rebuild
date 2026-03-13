import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { text, voice_id, provider = "elevenlabs" } = await req.json();

    if (!text || !voice_id) {
      return Response.json({ error: "Missing text or voice_id" }, { status: 400 });
    }

    let audioBuffer;

    if (provider === "elevenlabs") {
      const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
      if (!apiKey) {
        return Response.json({ use_browser_tts: true, suggested_voice: voice_id });
      }

      // Our voice library uses "el_" prefixed IDs. For ElevenLabs API,
      // we need to use a real voice ID. Fall back to a default multilingual voice.
      // Map synthetic IDs to a real default ElevenLabs voice.
      const isCustomId = voice_id.startsWith("el_");
      const effectiveELVoiceId = isCustomId ? "21m00Tcm4TlvDq8ikWAM" : voice_id;
      // "21m00Tcm4TlvDq8ikWAM" = Rachel (default ElevenLabs voice)

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${effectiveELVoiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.5 },
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("ElevenLabs error:", err);
        return Response.json({ use_browser_tts: true, suggested_voice: voice_id });
      }

      audioBuffer = await response.arrayBuffer();
    } else if (provider === "openai") {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return Response.json({ use_browser_tts: true, suggested_voice: voice_id });
      }

      // Only official OpenAI voices work with their TTS API
      const validOpenAIVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "verse", "sage", "breeze", "ember", "aurora", "orion", "ripple", "lunar"];
      // Strip language suffix for OpenAI Indian voices (e.g. "kamal-en-in" -> fallback)
      const baseVoiceId = voice_id.split("-")[0];
      const effectiveVoice = validOpenAIVoices.includes(voice_id) ? voice_id : (validOpenAIVoices.includes(baseVoiceId) ? baseVoiceId : "nova");

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: effectiveVoice,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("OpenAI TTS error:", err);
        return Response.json({ use_browser_tts: true, suggested_voice: voice_id });
      }

      audioBuffer = await response.arrayBuffer();
    } else if (provider === "twilio") {
      return Response.json({
        use_browser_tts: true,
        suggested_voice: voice_id.replace("Polly.", "").replace("polly-", ""),
      });
    } else {
      return Response.json({ use_browser_tts: true, suggested_voice: voice_id });
    }

    // Convert to base64
    const bytes = new Uint8Array(audioBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    return Response.json({ audio_base64: base64Audio });
  } catch (error) {
    console.error("Preview error:", error);
    return Response.json({
      use_browser_tts: true,
      suggested_voice: "nova",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});