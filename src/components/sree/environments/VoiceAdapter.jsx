// ═══════════════════════════════════════════════════════════════
// VOICE ADAPTER — capability-aware listen/speak stubs
// Enabled only in desktop mode. web/base44 returns structured errors.
// ═══════════════════════════════════════════════════════════════
import { detectEnvironment } from "../engine/environmentDetector";

function getEnv() { return detectEnvironment(); }

export async function voiceListen() {
  const env = getEnv();
  if (!env.canVoiceListen) {
    return {
      ok: false,
      error: "VOICE_DISABLED",
      reason: env.voiceDiagnostic?.voiceDisabledReason || "Voice listen not available in this environment.",
    };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { ok: true, stream };
  } catch (e) {
    return { ok: false, error: "MIC_ACCESS_DENIED", reason: e.message };
  }
}

export function voiceSpeak(text = "") {
  const env = getEnv();
  if (!env.canVoiceSpeak) {
    return {
      ok: false,
      error: "VOICE_DISABLED",
      reason: env.voiceDiagnostic?.voiceDisabledReason || "Voice speak not available in this environment.",
    };
  }
  try {
    const utt = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utt);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "TTS_FAILED", reason: e.message };
  }
}

export function getVoiceCapabilities() {
  const env = getEnv();
  return {
    canListen: env.canVoiceListen,
    canSpeak: env.canVoiceSpeak,
    diagnostic: env.voiceDiagnostic,
  };
}