/**
 * Sree Integration Registry
 * Central registry of available integrations that connect Sree
 * to the platform's backend APIs, CRM, databases, and external services.
 */

import { base44 } from "@/api/base44Client";

// ─── Registry definition ──────────────────────────────────────────────────────
export const INTEGRATION_REGISTRY = [
  {
    id: "aevoice_agents",
    name: "AEVOICE Agents",
    category: "core",
    description: "Read and manage AI agents",
    icon: "🤖",
    capabilities: ["list", "create", "update", "delete"],
    invoke: async (action, params) => {
      switch (action) {
        case "list":   return await base44.entities.Agent.list("-updated_date", params?.limit || 20);
        case "create": return await base44.entities.Agent.create(params);
        case "update": return await base44.entities.Agent.update(params.id, params.data);
        case "delete": return await base44.entities.Agent.delete(params.id);
        default: throw new Error(`Unknown action: ${action}`);
      }
    },
  },
  {
    id: "aevoice_knowledge",
    name: "Knowledge Base",
    category: "core",
    description: "Retrieve and manage knowledge bases",
    icon: "📚",
    capabilities: ["list", "search", "create", "update"],
    invoke: async (action, params) => {
      switch (action) {
        case "list":   return await base44.entities.KnowledgeBase.list("-updated_date", 20);
        case "search": return await base44.functions.invoke("kbRetrieval", { query: params.query, limit: params.limit || 5 });
        case "create": return await base44.entities.KnowledgeBase.create(params);
        case "update": return await base44.entities.KnowledgeBase.update(params.id, params.data);
        default: throw new Error(`Unknown action: ${action}`);
      }
    },
  },
  {
    id: "aevoice_calls",
    name: "Call Sessions",
    category: "telephony",
    description: "Query and manage call history and sessions",
    icon: "📞",
    capabilities: ["list", "filter", "summarize"],
    invoke: async (action, params) => {
      switch (action) {
        case "list":    return await base44.entities.CallSession.list("-created_date", params?.limit || 20);
        case "filter":  return await base44.entities.CallSession.filter(params.filters, "-created_date", params.limit || 20);
        case "summarize": return await base44.functions.invoke("summarizeCallSession", params);
        default: throw new Error(`Unknown action: ${action}`);
      }
    },
  },
  {
    id: "aevoice_crm",
    name: "CRM Customers",
    category: "crm",
    description: "Access and update customer profiles",
    icon: "👤",
    capabilities: ["list", "search", "create", "update"],
    invoke: async (action, params) => {
      switch (action) {
        case "list":   return await base44.entities.Customer.list("-created_date", params?.limit || 30);
        case "search": return await base44.entities.Customer.filter({ $text: params.query });
        case "create": return await base44.entities.Customer.create(params);
        case "update": return await base44.entities.Customer.update(params.id, params.data);
        default: throw new Error(`Unknown action: ${action}`);
      }
    },
  },
  {
    id: "aevoice_analytics",
    name: "Analytics",
    category: "analytics",
    description: "Fetch call analytics and usage metrics",
    icon: "📊",
    capabilities: ["summary", "report"],
    invoke: async (action, params) => {
      switch (action) {
        case "summary": return await base44.functions.invoke("callAnalytics", params || {});
        case "report":  return await base44.functions.invoke("getCommunicationUsageSummary", params || {});
        default: throw new Error(`Unknown action: ${action}`);
      }
    },
  },
  {
    id: "aevoice_llm",
    name: "LLM Proxy",
    category: "ai",
    description: "Direct LLM calls for custom AI tasks",
    icon: "🧠",
    capabilities: ["invoke"],
    invoke: async (action, params) => {
      return await base44.integrations.Core.InvokeLLM({
        prompt: params.prompt,
        add_context_from_internet: params.web || false,
        response_json_schema: params.schema || null,
      });
    },
  },
  {
    id: "aevoice_phone",
    name: "Phone Numbers",
    category: "telephony",
    description: "Manage phone numbers and routing",
    icon: "📱",
    capabilities: ["list", "provision"],
    invoke: async (action, params) => {
      switch (action) {
        case "list":      return await base44.entities.PhoneNumber.list("-created_date", 20);
        case "provision": return await base44.functions.invoke("provisionPlatformNumber", params);
        default: throw new Error(`Unknown action: ${action}`);
      }
    },
  },
];

// ─── Registry API ─────────────────────────────────────────────────────────────
export function getIntegration(id) {
  return INTEGRATION_REGISTRY.find(i => i.id === id);
}

export function getIntegrationsByCategory(category) {
  return INTEGRATION_REGISTRY.filter(i => i.category === category);
}

export async function invokeIntegration(id, action, params) {
  const integration = getIntegration(id);
  if (!integration) throw new Error(`Integration '${id}' not found`);
  if (!integration.capabilities.includes(action)) throw new Error(`Action '${action}' not supported by '${id}'`);
  return await integration.invoke(action, params);
}

// ─── NLU → Integration router ─────────────────────────────────────────────────
export function resolveIntegrationFromIntent(intent, entities) {
  const map = {
    create_agent: { id: "aevoice_agents", action: "create" },
    check_status: { id: "aevoice_analytics", action: "summary" },
    analytics:    { id: "aevoice_analytics", action: "summary" },
    query_knowledge: { id: "aevoice_knowledge", action: "search" },
    fix_error:    { id: "aevoice_agents", action: "list" },
  };
  return map[intent] || null;
}