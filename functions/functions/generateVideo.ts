import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, duration = 5 } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Get client for current user
    const clients = await base44.entities.Client.filter({
      contact_email: user.email,
    });
    const client = clients[0];

    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch user's Google AI API key from IntegrationConfig
    const integrations = await base44.entities.IntegrationConfig.filter({
      agency_id: client.agency_id,
      provider: "google_ai",
    });

    const googleAiConfig = integrations[0];
    const userApiKey = googleAiConfig?.config?.api_key;

    if (!userApiKey) {
      return Response.json({
        error: "Google AI API key not configured",
        message:
          "Please configure your Google AI API key in Marketing Hub settings to use video generation",
      }, { status: 400 });
    }

    // Call Google AI (Veo) API for video generation
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/veo-001:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userApiKey}`,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text:
                `Generate a professional marketing video with this description: ${prompt}. Duration: ${duration} seconds.`,
            }],
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Google AI API error:", error);

      return Response.json({
        error: "Video generation failed",
        details: "Please check your API key and ensure you have access to Veo API",
        fallback: "Using AI to generate video script instead",
      }, { status: 500 });
    }

    const data = await response.json();

    // Extract video URL or data from response
    const videoData = data.candidates?.[0]?.content?.parts?.[0];

    return Response.json({
      success: true,
      video_url: videoData?.videoUrl || null,
      video_data: videoData,
      message: videoData?.videoUrl
        ? "Video generated successfully"
        : "Video generation in progress - check back in a few minutes",
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      suggestion: "Consider using video script generation instead, or check your API configuration",
    }, { status: 500 });
  }
});
