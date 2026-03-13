import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

export default async function smokeTest(req) {
  try {
    const base44 = createClientFromRequest(req);
    // DB test
    await base44.asServiceRole.entities.Agent.list({ limit: 1 });

    // OpenAI test (optional: short non-streaming call)
    // (Guard with a feature flag or env var to avoid overuse)
    // await openai.chat.completions.create({ ... });

    // Health check endpoint (already implemented) could be reused
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[smokeTest] FAILED:", error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Deno.serve(smokeTest);
