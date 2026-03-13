import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const target = "https://aevathon.aevoice.ai/workautomation";

  try {
    const base44 = createClientFromRequest(req);
    const method = req.method || "POST";
    const body = method === "GET" ? undefined : await req.text();

    const res = await fetch(target, {
      method,
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
      },
      body,
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[workautomationHooks] failed", {
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
