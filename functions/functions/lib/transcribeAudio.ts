import OpenAI from "npm:openai@4.28.0";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

export async function transcribeAudio(url) {
  try {
    console.log("Downloading audio for transcription:", url);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch audio");

    const blob = await response.blob();
    // OpenAI requires a file name with extension to guess format
    const file = new File([blob], "recording.mp3", { type: "audio/mp3" });

    const transcript = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    return transcript.text;
  } catch (e) {
    console.error("Transcription error:", e);
    return "";
  }
}
