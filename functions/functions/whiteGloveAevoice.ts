Deno.serve(async (req) => {
  try {
    const method = req.method || "POST";
    const body = method === "GET" ? undefined : await req.text();
    const res = await fetch("https://aevathon.aevoice.ai/whiteglove", {
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
    console.error(
      "[whiteGloveAevoice] failed",
      error instanceof Error ? error.message : String(error),
    );
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
