import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    createClientFromRequest(req); // Ensure app context
    let target = "";
    if (path.endsWith("/aevoice")) {
      target = "https://aevathon.aevoice.ai/whiteglove";
    } else if (path.endsWith("/hellobiz")) {
      target = "https://aevathon.hellobiz.app/whiteglove";
    } else return Response.json({ error: "Not found" }, { status: 404 });

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
    console.error("[whiteGloveWebhooks] failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
