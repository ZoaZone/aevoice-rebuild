import { z } from "npm:zod@3.24.2";

export const streamingChatSchema = z.object({
  message: z.string().min(1).max(2000),
  widgetId: z.string().optional(),
  agentId: z.string().min(1).optional(),
  sessionToken: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .optional(),
});
