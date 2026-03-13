import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import axios from "npm:axios";
import * as cheerio from "npm:cheerio";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Auto-learn website request received", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    await base44.auth.me(); // Validate auth

    const { website_url, max_pages = 10 } = await req.json();

    if (!website_url) {
      return Response.json({ error: "Website URL is required" }, {
        status: 400,
      });
    }

    logger.info("Starting auto-learning", {
      request_id: requestId,
      website_url,
      max_pages,
    });

    const visited = new Set();
    const toVisit = [website_url];
    const learnedContent = [];
    const baseUrl = new URL(website_url).origin;

    // Crawl pages
    while (toVisit.length > 0 && visited.size < max_pages) {
      const url = toVisit.pop();

      if (visited.has(url)) continue;
      visited.add(url);

      try {
        logger.info("Crawling page", {
          request_id: requestId,
          url,
        });
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            "User-Agent": "AEVOICE-Bot/1.0",
          },
        });

        const $ = cheerio.load(response.data);

        // Remove script, style, nav, footer
        $("script, style, nav, footer, header").remove();

        // Extract text content
        const title = $("title").text().trim();
        const headings = [];
        $("h1, h2, h3").each((i, el) => {
          headings.push($(el).text().trim());
        });

        const paragraphs = [];
        $("p").each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 20) {
            paragraphs.push(text);
          }
        });

        // Extract links for crawling
        $("a[href]").each((i, el) => {
          const href = $(el).attr("href");
          if (href && !href.startsWith("#") && !href.startsWith("mailto:")) {
            try {
              const absoluteUrl = new URL(href, url).href;
              if (
                absoluteUrl.startsWith(baseUrl) && !visited.has(absoluteUrl)
              ) {
                toVisit.push(absoluteUrl);
              }
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });

        // Store learned content
        if (title || headings.length > 0 || paragraphs.length > 0) {
          learnedContent.push({
            url,
            title,
            headings,
            content: paragraphs.join("\n\n"),
          });
        }
      } catch (error) {
        logger.error("Failed to crawl page", {
          request_id: requestId,
          url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Create knowledge base entry
    const knowledgeText = learnedContent.map((page) =>
      `Page: ${page.title}\nURL: ${page.url}\n\n${page.headings.join("\n")}\n\n${page.content}`
    ).join("\n\n---\n\n");

    // Use LLM to extract structured information
    const structuredInfo = await base44.asServiceRole.integrations.Core
      .InvokeLLM({
        prompt: `Analyze this website content and extract key business information:

${knowledgeText.substring(0, 20000)}

Return JSON with:
- company_name: string
- description: string (2-3 sentences)
- services: array of strings
- contact_info: object with email, phone if found
- key_facts: array of important facts (max 10)
- faqs: array of {question, answer} objects if found`,
        response_json_schema: {
          type: "object",
          properties: {
            company_name: { type: "string" },
            description: { type: "string" },
            services: { type: "array", items: { type: "string" } },
            contact_info: { type: "object" },
            key_facts: { type: "array", items: { type: "string" } },
            faqs: { type: "array", items: { type: "object" } },
          },
        },
      });

    logger.info("Learning completed", {
      request_id: requestId,
      pages_crawled: visited.size,
    });

    return Response.json({
      success: true,
      pages_crawled: visited.size,
      structured_info: structuredInfo,
      raw_content: learnedContent,
      message: `Successfully learned from ${visited.size} pages`,
    });
  } catch (error) {
    logger.error("Auto-learn failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
