/**
 * Sree Proactive Suggestion Engine
 * Anticipates user needs based on conversation context, intent history,
 * current page, and platform data.
 */

import { base44 } from "@/api/base44Client";

// ─── Suggestion rules ─────────────────────────────────────────────────────
const RULES = [
  {
    id: "agent_no_kb",
    trigger: (ctx) => ctx.intent === "create_agent",
    suggestions: ["Add a knowledge base to your agent for better answers", "Test the agent with a voice preview", "Configure call routing for this agent"],
  },
  {
    id: "error_fix",
    trigger: (ctx) => ctx.intent === "fix_error" || ctx.sentiment === "negative",
    suggestions: ["Run self-healing diagnostics", "Check RLS permissions", "Review recent error logs in the Monitor"],
  },
  {
    id: "analytics_deep",
    trigger: (ctx) => ctx.intent === "analytics",
    suggestions: ["View call sentiment breakdown", "Export call history to CSV", "Set up automated weekly report"],
  },
  {
    id: "knowledge_stale",
    trigger: (ctx) => ctx.intent === "query_knowledge" && ctx.kbStaleDays > 7,
    suggestions: ["Your knowledge base hasn't synced in a while — trigger a re-sync", "Add new FAQs to improve answer quality"],
  },
  {
    id: "greet_new",
    trigger: (ctx) => ctx.intent === "greeting" && ctx.turnCount <= 1,
    suggestions: ["See what's new in your dashboard", "Create a new AI agent", "Review recent call sessions"],
  },
  {
    id: "schedule_followup",
    trigger: (ctx) => ctx.intent === "schedule",
    suggestions: ["Set up automated SMS reminders for appointments", "Link appointments to your CRM"],
  },
  {
    id: "navigation",
    trigger: (ctx) => ctx.intent === "navigate" && ctx.entities?.page,
    suggestions: [],
    dynamic: (ctx) => [`Navigate to ${ctx.entities.page}`, `Bookmark ${ctx.entities.page} for quick access`],
  },
  {
    id: "configure_agent",
    trigger: (ctx) => ctx.intent === "configure",
    suggestions: ["Update the agent's system prompt", "Adjust voice settings", "Enable multi-language detection"],
  },
];

// ─── Page-based contextual suggestions ───────────────────────────────────────
const PAGE_SUGGESTIONS = {
  Dashboard: ["Check your most active agents", "Review today's call volume", "Set up a new campaign"],
  Agents: ["Test agent with live voice preview", "Link knowledge base to agent", "Add phone number to agent"],
  Knowledge: ["Sync from website URL", "Add FAQs manually", "Run embedding rebuild"],
  Analytics: ["Compare this week vs last week", "Download full report", "Filter by agent"],
  CallHistory: ["Summarize recent calls with AI", "Export to CRM", "Flag calls for follow-up"],
  Billing: ["Review usage this month", "Upgrade plan", "Set up auto-recharge"],
};

// ─── Main function ────────────────────────────────────────────────────────────
export async function getProactiveSuggestions({ intent, entities, sentiment, turnCount, currentPage }) {
  const ctx = { intent, entities, sentiment, turnCount, currentPage, kbStaleDays: 0 };

  // Try to get KB freshness
  try {
    const res = await base44.entities.KnowledgeBase.list("-updated_date", 1);
    if (res?.[0]?.last_synced_at) {
      const days = (Date.now() - new Date(res[0].last_synced_at).getTime()) / 86400000;
      ctx.kbStaleDays = Math.round(days);
    }
  } catch {}

  const suggestions = new Set();

  // Rule-based
  for (const rule of RULES) {
    if (rule.trigger(ctx)) {
      if (rule.dynamic) {
        rule.dynamic(ctx).forEach(s => suggestions.add(s));
      } else {
        rule.suggestions.slice(0, 2).forEach(s => suggestions.add(s));
      }
    }
  }

  // Page-based fallback
  if (suggestions.size === 0 && currentPage && PAGE_SUGGESTIONS[currentPage]) {
    PAGE_SUGGESTIONS[currentPage].slice(0, 2).forEach(s => suggestions.add(s));
  }

  // Generic fallback
  if (suggestions.size === 0) {
    ["Ask me anything about your agents", "Check your call analytics", "Create a new knowledge base"].forEach(s => suggestions.add(s));
  }

  return [...suggestions].slice(0, 3);
}