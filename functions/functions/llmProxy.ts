import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("LLM proxy request received", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, error: "unauthorized" }, {
        status: 401,
      });
    }

    const body = await req.json();
    const { provider, prompt, options } = body || {};
    if (!provider || !prompt) {
      return Response.json({ ok: false, error: "missing_params" }, {
        status: 400,
      });
    }

    if (provider === "openai") {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return Response.json({ ok: false, error: "OPENAI_API_KEY_missing" }, {
          status: 200,
        });
      }
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: (options?.model || "gpt-4o-mini"),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 512,
          messages: [
            {
              role: "system",
              content: options?.system || "You are a helpful assistant.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || "";
      return Response.json({ ok: true, output: text });
    }

    if (provider === "gemini") {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) {
        return Response.json({ ok: false, error: "GEMINI_API_KEY_missing" }, {
          status: 200,
        });
      }
      const model = options?.model || "gemini-1.5-flash";
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      return Response.json({ ok: true, output: text });
    }

    if (provider === "claude") {
      const key = Deno.env.get("ANTHROPIC_API_KEY");
      if (!key) {
        return Response.json(
          { ok: false, error: "ANTHROPIC_API_KEY_missing" },
          { status: 200 },
        );
      }
      const model = options?.model || "claude-3-5-haiku-latest";
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: options?.max_tokens ?? 512,
          messages: [
            options?.system ? { role: "system", content: options.system } : undefined,
            { role: "user", content: prompt },
          ].filter(Boolean),
        }),
      });
      const data = await resp.json();
      const text = data?.content?.map((p) => p.text).join("") || "";
      return Response.json({ ok: true, output: text });
    }

    return Response.json({ ok: false, error: "unsupported_provider" }, {
      status: 400,
    });
  } catch (error) {
    logger.error("LLM proxy request failed", {
      request_id: requestId,
      error: error?.message || "unknown error",
    });
    return Response.json(
      { ok: false, error: error?.message || "server_error" },
      { status: 500 },
    );
  }
});
