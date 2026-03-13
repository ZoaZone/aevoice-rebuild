import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import * as cheerio from "npm:cheerio@1.0.0-rc.12";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const base44 = createClientFromRequest(req);

  // Auth
  let user;
  try {
    user = await base44.auth.me();
  } catch (e) {
    console.error("[ScrapeKB] Auth error:", e.message);
  }
  if (!user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const url = body?.url;
    const knowledge_base_id = body?.knowledge_base_id;

    if (!url || !knowledge_base_id) {
      return Response.json({ success: false, error: "url and knowledge_base_id required" }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl.replace(/^(www\.)?/i, "");
    }

    console.log("[ScrapeKB] Fetching:", normalizedUrl);

    // Fetch website with retry and better error handling
    let response;
    let retries = 2;
    let lastError;
    
    while (retries > 0) {
      try {
        response = await fetch(normalizedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.google.com/",
          },
          signal: AbortSignal.timeout(15000),
          redirect: 'follow'
        });
        break;
      } catch (err) {
        lastError = err;
        retries--;
        console.warn("[ScrapeKB] Fetch attempt failed:", err.message, "- retries left:", retries);
        if (retries === 0) throw lastError;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (!response.ok) {
      console.error("[ScrapeKB] HTTP error:", response.status, response.statusText);
      return Response.json({ success: false, error: `Could not fetch website: ${response.statusText} (HTTP ${response.status}). The URL may be unreachable or block automated access. Try uploading documents instead.`, chunks_created: 0 }, { status: 200 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe, noscript, svg, img").remove();

    // Extract text from best content element
    let text = "";
    const selectors = ["article", "main", '[role="main"]', ".content", ".post-content", "#content", "body"];
    for (const sel of selectors) {
      const extracted = $(sel).text();
      if (extracted && extracted.trim().length > 200) {
        text = extracted;
        console.log("[ScrapeKB] Extracted via selector:", sel, "length:", extracted.length);
        break;
      }
    }

    // Fallback: strip tags manually
    if (!text || text.trim().length < 100) {
      const raw = $("body").html() || html || "";
      text = raw
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Clean
    text = (text || "")
      .replace(/[*#_-]{2,}/g, "")
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text || text.length < 50) {
      console.warn("[ScrapeKB] No meaningful content. Length:", text?.length || 0);
      return Response.json({
        success: false,
        error: "No meaningful content found. The site may use JavaScript rendering.",
        chunks_created: 0,
      }, { status: 200 });
    }

    // Verify KB exists and belongs to user's client
    let kbs;
    try {
      kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({ id: knowledge_base_id });
    } catch (e) {
      return Response.json({ success: false, error: "Knowledge base not found" }, { status: 404 });
    }
    if (!kbs?.length) {
      return Response.json({ success: false, error: "Knowledge base not found" }, { status: 404 });
    }
    const kb = kbs[0];

    if (user.role !== "admin" && user.data?.client_id && kb.client_id !== user.data.client_id) {
      return Response.json({ success: false, error: "Forbidden: cross-tenant access" }, { status: 403 });
    }

    // Chunk by ~300 words
    const words = text.split(/\s+/).filter(Boolean);
    const wordsPerChunk = 300;
    const chunks = [];
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const content = words.slice(i, i + wordsPerChunk).join(" ").trim();
      if (content.length < 50) continue;
      chunks.push({
        knowledge_base_id,
        source_type: "url",
        source_ref: url,
        title: `Scraped Content ${Math.floor(i / wordsPerChunk) + 1}`,
        content,
        metadata: { scraped_at: new Date().toISOString() },
      });
    }

    if (chunks.length === 0 && words.length > 0) {
      const content = words.join(" ").trim();
      if (content.length >= 50) {
        chunks.push({
          knowledge_base_id,
          source_type: "url",
          source_ref: url,
          title: "Scraped Content 1",
          content,
          metadata: { scraped_at: new Date().toISOString() },
        });
      }
    }

    // Save chunks via service role
    let createdCount = 0;
    for (const chunk of chunks) {
      try {
        await base44.asServiceRole.entities.KnowledgeChunk.create({
          ...chunk,
          created_by: user.email,
        });
        createdCount++;
      } catch (e) {
        console.error("[ScrapeKB] Chunk create failed:", e.message);
      }
    }

    if (createdCount === 0) {
      return Response.json({
        success: false,
        error: "Failed to save knowledge chunks",
        chunks_created: 0,
      }, { status: 200 });
    }

    // Update KB stats
    let totalWords = 0;
    try {
      await new Promise(r => setTimeout(r, 300));
      const allChunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({ knowledge_base_id });
      totalWords = allChunks.reduce((sum, c) => sum + (c.content?.split(/\s+/).length || 0), 0);
      await base44.asServiceRole.entities.KnowledgeBase.update(knowledge_base_id, {
        chunk_count: allChunks.length,
        total_words: totalWords,
        last_synced_at: new Date().toISOString(),
        status: "active",
      });
    } catch (e) {
      console.warn("[ScrapeKB] KB stats update failed:", e.message);
    }

    console.log("[ScrapeKB] Done. Created:", createdCount, "chunks from", normalizedUrl);
    return Response.json({
      success: true,
      url: normalizedUrl,
      chunks_created: createdCount,
      total_words: totalWords,
      message: `Scraped ${normalizedUrl}: ${createdCount} chunks created`,
    });
  } catch (error) {
    console.error("[ScrapeKB] Error:", error.message);
    return Response.json({
      success: false,
      error: error.message || "Failed to scrape website",
      chunks_created: 0,
    }, { status: 200 });
  }
});