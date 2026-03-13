import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { transcribeAudio } from "./lib/transcribeAudio.ts";
import { detectLanguage } from "./lib/detectLanguage.ts";
import { logError, logInfo } from "./lib/logger.ts";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const formData = await req.formData();
    const RecordingUrl = formData.get("RecordingUrl");
    const CallSid = formData.get("CallSid");
    const RecordingStatus = formData.get("RecordingStatus");

    logInfo("Recording callback received", {
      CallSid,
      RecordingStatus,
      RecordingUrl,
    });

    if (RecordingStatus === "completed" && RecordingUrl) {
      // 1. Update CallLog with recording URL
      // We need to find the ID first because update takes ID, usually.
      // But Base44 SDK `update` might take a query if it's `updateMany` style,
      // typically it's `update(id, data)`.
      // Let's find it first.

      const logs = await base44.asServiceRole.entities.CallLog.filter({
        twilio_call_sid: CallSid,
      });
      if (logs.length > 0) {
        const logId = logs[0].id;

        // 2. Transcribe
        const transcript = await transcribeAudio(RecordingUrl);
        const language = detectLanguage(transcript);

        await base44.asServiceRole.entities.CallLog.update(logId, {
          recording_url: RecordingUrl,
          recording_received_at: new Date().toISOString(),
          transcript: transcript,
          transcript_language: language,
        });

        logInfo("Recording processed and transcribed", { CallSid, language });
      } else {
        logError("CallLog not found for recording", { CallSid });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    logError("Recording callback failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("Error", { status: 500 });
  }
});
