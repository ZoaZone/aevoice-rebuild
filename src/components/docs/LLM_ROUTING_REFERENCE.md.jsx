# LLM Routing Reference (Base44-first)

Order:
1) Base44 Core.InvokeLLM
2) OpenAI via backend llmProxy (OPENAI_API_KEY)
3) Gemini via llmProxy (GEMINI_API_KEY)
4) Claude via llmProxy (ANTHROPIC_API_KEY)
5) Graceful fallback message

Return shape: { ok, output?, error?, provider }

Usage:
```
import { runLLM } from '@/components/llm/llmRouter';
const res = await runLLM(prompt, { model: 'gpt-4o-mini' });
``