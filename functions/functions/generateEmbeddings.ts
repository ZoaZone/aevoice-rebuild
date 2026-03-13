import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import OpenAI from "npm:openai@4.77.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized - admin only" }, {
        status: 401,
      });
    }

    const { knowledge_base_id } = await req.json();

    // Get all chunks for this knowledge base with empty embeddings
    const chunks = await base44.asServiceRole.entities.KnowledgeChunk.filter({
      knowledge_base_id,
    });

    let updatedCount = 0;

    for (const chunk of chunks) {
      // Skip if already has embedding
      if (chunk.embedding && chunk.embedding.length > 0) {
        continue;
      }

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.content,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Calculate token count (rough estimate: ~4 chars per token)
      const tokenCount = Math.ceil(chunk.content.length / 4);

      // Update chunk with embedding and token count
      await base44.asServiceRole.entities.KnowledgeChunk.update(chunk.id, {
        embedding,
        token_count: tokenCount,
      });

      updatedCount++;
    }

    return Response.json({
      success: true,
      message: `Generated embeddings for ${updatedCount} chunks`,
      total_chunks: chunks.length,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Embedding generation error:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
