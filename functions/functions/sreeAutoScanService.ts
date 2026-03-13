import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const base44 = createClientFromRequest(req);
    const userRes = await base44.auth.me();
    const user = userRes.data as { id: string; role: string } | null;

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { website_url?: string; kb_id?: string };
    const websiteUrl = (body.website_url || "").trim();
    if (!websiteUrl) {
      return Response.json(
        { error: "website_url_required" },
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const job = {
      id: crypto.randomUUID(),
      status: "queued" as const,
      website_url: websiteUrl,
      kb_id: body.kb_id || null,
      created_at: new Date().toISOString(),
    };

    try {
      await base44.asServiceRole.entities.DebugLog?.create?.({
        category: "sree_auto_scan",
        message: `Queued scan for ${websiteUrl}`,
        metadata: job,
      });
    } catch (_err: unknown) {
      // ignore optional logging failures
    }

    return Response.json(
      { job },
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (err: unknown) {
    console.error("[sreeAutoScanService] Error:", err);
    return Response.json(
      { error: "sree_auto_scan_failed" },
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
});