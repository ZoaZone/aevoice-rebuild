import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import mammoth from "npm:mammoth@1.11.0";

const CHUNK_SIZE = 1500;

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const base44 = createClientFromRequest(req);

  let user;
  try {
    user = await base44.auth.me();
  } catch (e) {
    console.error("[UploadDoc] Auth error:", e.message);
  }
  if (!user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { file_url, knowledge_base_id, file_name, mime_type } = await req.json();

    if (!file_url || !knowledge_base_id) {
      return Response.json({ success: false, error: "file_url and knowledge_base_id required" }, { status: 400 });
    }

    const ext = (file_name || "").toLowerCase().split(".").pop() || "";
    // Supported formats — DOCX is fully supported via mammoth arrayBuffer API
    const validExts = ["pdf", "txt", "csv", "docx", "doc"];
    if (!validExts.includes(ext)) {
      return Response.json({
        success: false,
        error: `Unsupported file type: .${ext}. Supported formats: PDF, TXT, CSV, DOCX`,
      }, { status: 422 });
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

    // Tenant isolation check
    if (user.role !== "admin" && user.data?.client_id && kb.client_id !== user.data.client_id) {
      return Response.json({ success: false, error: "Forbidden: KB belongs to a different client" }, { status: 403 });
    }

    // Download file
    console.log("[UploadDoc] Downloading:", file_url);
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({
        success: false,
        error: `File URL not accessible (HTTP ${fileResponse.status})`,
      }, { status: 422 });
    }
    const fileBuffer = await fileResponse.arrayBuffer();
    console.log("[UploadDoc] Downloaded bytes:", fileBuffer.byteLength);

    let extractedText = "";

    if (ext === "docx" || ext === "doc") {
      // Use mammoth with arrayBuffer directly — avoids file-path issues in Deno
      try {
        console.log("[UploadDoc] Extracting DOCX via mammoth.extractRawText (arrayBuffer)...");
        const result = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
        extractedText = (result?.value || "").trim();
        console.log("[UploadDoc] DOCX extractRawText success, length:", extractedText.length);
      } catch (err) {
        console.warn("[UploadDoc] extractRawText failed:", err.message, "- trying convertToHtml...");
        try {
          const htmlResult = await mammoth.convertToHtml({ arrayBuffer: fileBuffer });
          extractedText = (htmlResult?.value || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          console.log("[UploadDoc] DOCX convertToHtml fallback, length:", extractedText.length);
        } catch (err2) {
          console.error("[UploadDoc] Both DOCX methods failed:", err2.message);
          return Response.json({
            success: false,
            error: "DOCX parsing failed. The file may be corrupted or password-protected. Try saving as PDF.",
          }, { status: 422 });
        }
      }

    } else if (ext === "txt" || ext === "csv") {
      try {
        extractedText = new TextDecoder().decode(fileBuffer);
      } catch (err) {
        console.error("[UploadDoc] Text decode error:", err.message);
        return Response.json({ success: false, error: "Could not decode text file: " + err.message }, { status: 422 });
      }

    } else if (ext === "pdf") {
      try {
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              content: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                  },
                },
              },
            },
          },
        });
        if (result?.status === "success" && result.output) {
          if (result.output.content) {
            extractedText = String(result.output.content);
          } else if (Array.isArray(result.output.sections)) {
            extractedText = result.output.sections
              .map((s) => `${s.title || ""}\n${s.content || ""}`)
              .join("\n\n");
          }
        }
      } catch (err) {
        console.error("[UploadDoc] PDF extraction failed:", err.message);
        return Response.json({ success: false, error: "PDF processing failed: " + err.message }, { status: 422 });
      }
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return Response.json({
        success: false,
        error: "Document contains no readable text. Ensure the file is not empty or image-only.",
      }, { status: 422 });
    }

    // Chunk text
    const textChunks = chunkText(extractedText, CHUNK_SIZE);
    console.log("[UploadDoc] Total chunks to create:", textChunks.length);

    // Store chunks via service role
    let created = 0;
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      if (!chunk.trim()) continue;
      try {
        await base44.asServiceRole.entities.KnowledgeChunk.create({
          knowledge_base_id,
          source_type: "file",
          source_ref: file_name || "uploaded_file",
          title: `${file_name || "File"} — Part ${i + 1}`,
          content: chunk,
          created_by: user.email,
        });
        created++;
      } catch (e) {
        console.error("[UploadDoc] Chunk create failed:", e.message);
      }
    }

    // Update KB stats
    try {
      await new Promise((r) => setTimeout(r, 300));
      const allChunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({ knowledge_base_id });
      const totalWords = allChunks.reduce((sum, c) => sum + (c.content?.split(" ").length || 0), 0);
      await base44.asServiceRole.entities.KnowledgeBase.update(knowledge_base_id, {
        chunk_count: allChunks.length,
        total_words: totalWords,
        last_synced_at: new Date().toISOString(),
        status: "active",
      });
    } catch (e) {
      console.warn("[UploadDoc] KB stats update failed:", e.message);
    }

    console.log("[UploadDoc] Done. Created:", created, "chunks from", file_name);
    return Response.json({
      success: true,
      chunks_created: created,
      message: `Processed "${file_name}": ${created} chunks created`,
    });
  } catch (error) {
    console.error("[UploadDoc] Unexpected error:", error.message, error.stack);
    return Response.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
});

function chunkText(text, chunkSize) {
  const words = String(text || "").split(/\s+/);
  const chunks = [];
  let current = [];
  let size = 0;
  for (const word of words) {
    if (size + word.length + 1 > chunkSize && current.length > 0) {
      chunks.push(current.join(" "));
      current = [word];
      size = word.length;
    } else {
      current.push(word);
      size += word.length + 1;
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}