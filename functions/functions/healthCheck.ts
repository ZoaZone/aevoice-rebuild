import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  // CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  const status = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: "pending",
      openai: "pending",
      twilio: "pending",
    },
    latency: 0,
  };

  try {
    const base44 = createClientFromRequest(req);

    // 1. Check Database Connectivity
    try {
      const dbStart = Date.now();
      await base44.asServiceRole.entities.User.list({ limit: 1 });
      status.checks.database = "ok";
      status.checks.database_latency = `${Date.now() - dbStart}ms`;
    } catch (dbError) {
      console.error("Database Check Failed:", dbError);
      status.checks.database = "failed";
      status.status = "degraded";
    }

    // 2. Check OpenAI Configuration
    if (Deno.env.get("OPENAI_API_KEY")) {
      status.checks.openai = "configured";
    } else {
      status.checks.openai = "missing_key";
      status.status = "degraded";
    }

    // 3. Check Twilio Configuration
    if (
      Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN")
    ) {
      status.checks.twilio = "configured";
    } else {
      status.checks.twilio = "missing_key";
      status.status = "degraded";
    }

    status.latency = `${Date.now() - startTime}ms`;

    const httpStatus = status.status === "healthy" ? 200 : 503;

    return new Response(JSON.stringify(status), {
      status: httpStatus,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Health Check Critical Error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
});
