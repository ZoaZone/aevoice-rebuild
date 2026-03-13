import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    // Optional: trigger internal video generation when requested
    if (payload?.action === "generate_video") {
      try {
        const r = await base44.asServiceRole.functions.invoke(
          "generateVideo",
          payload,
        );
        return Response.json({
          success: true,
          task: "generateVideo",
          result: r.data,
        });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, {
          status: 500,
        });
      }
    }

    // Proxy to central Marketing Hub endpoint
    const res = await fetch("https://aevathon.aevoice.ai/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[marketingHubWebhook] failed", {
      requestId,
      ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
