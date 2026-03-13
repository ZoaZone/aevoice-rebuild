import { BASE44_TOOLS } from './base44ToolBinding';
import eventBus from './eventBus';

// ═══════════════════════════════════════════════════════════════
// TOOL EXECUTOR — Module tool invocation bridge
// ═══════════════════════════════════════════════════════════════

export const MODULE_TOOLS = {
  CodeReader: {
    readFile: async (path) => BASE44_TOOLS.File.read(path),
    listFiles: async (pattern) => BASE44_TOOLS.HTTP.request('POST', '/codeReader/list', { pattern }),
  },
  CodeWriter: {
    writeFile: async (path, content) => {
      throw new Error('CodeWriter.writeFile is DISABLED in Base44 (write-protected)');
    },
  },
  FileEditor: {
    edit: async (path, oldStr, newStr) => {
      throw new Error('FileEditor is DISABLED in Base44 (write-protected)');
    },
  },
  RepoNavigator: {
    indexProject: async () => BASE44_TOOLS.HTTP.request('POST', '/repoNavigator/index', {}),
    getContext: async () => BASE44_TOOLS.HTTP.request('GET', '/repoNavigator/context', {}),
  },
  AgentOrchestrator: {
    listAgents: async () => BASE44_TOOLS.DB.query('Agent', {}, 100),
    getAgent: async (agentId) => BASE44_TOOLS.DB.query('Agent', { id: agentId }, 1),
    createAgent: async (data) => BASE44_TOOLS.DB.mutate('Agent', 'create', data),
    updateAgent: async (agentId, data) => BASE44_TOOLS.DB.mutate('Agent', 'update', { id: agentId, ...data }),
  },
  KBManager: {
    listKBs: async () => BASE44_TOOLS.DB.query('KnowledgeBase', {}, 100),
    queryKB: async (query, limit = 10) => BASE44_TOOLS.HTTP.request('POST', '/kbRetrieval', { query, limit }),
    addChunk: async (kbId, content) => BASE44_TOOLS.DB.mutate('KnowledgeChunk', 'create', { knowledge_base_id: kbId, content }),
  },
  Validator: {
    validateAgent: async (agentId) => BASE44_TOOLS.HTTP.request('POST', '/validateAgent', { agent_id: agentId }),
    validateRLS: async () => BASE44_TOOLS.HTTP.request('GET', '/validateRLS', {}),
  },
  Debugger: {
    getDebugInfo: async (context) => BASE44_TOOLS.HTTP.request('POST', '/debugger/info', { context }),
    startDebugSession: async (target) => BASE44_TOOLS.HTTP.request('POST', '/debugger/start', { target }),
  },
  LogInspector: {
    streamLogs: async (filter) => BASE44_TOOLS.HTTP.request('POST', '/logs/stream', { filter }),
    getLogs: async (limit = 50) => BASE44_TOOLS.HTTP.request('GET', '/logs/get', { limit }),
  },
  PlatformDiagnostics: {
    runDiagnostics: async () => BASE44_TOOLS.HTTP.request('POST', '/diagnostics/run', {}),
    getHealth: async () => BASE44_TOOLS.HTTP.request('GET', '/diagnostics/health', {}),
  },
  WorkflowPlanner: {
    planWorkflow: async (description) => BASE44_TOOLS.HTTP.request('POST', '/planner/plan', { description }),
    listWorkflows: async () => BASE44_TOOLS.DB.query('AIWorkflow', {}, 100),
  },
  MultiStepExecutor: {
    execute: async (steps) => BASE44_TOOLS.HTTP.request('POST', '/executor/run', { steps }),
  },
};

export async function invokeTool(module, tool, params = {}) {
  const toolFn = MODULE_TOOLS[module]?.[tool];
  if (!toolFn) {
    const err = `Tool not found: ${module}.${tool}`;
    eventBus.emit('monitor:event', { type: 'error', source: 'ToolExecutor', action: 'tool_not_found', detail: err, ts: Date.now() });
    throw new Error(err);
  }

  try {
    eventBus.emit('monitor:event', { type: 'tool', source: 'ToolExecutor', action: 'invoke_start', detail: `${module}.${tool}`, ts: Date.now() });
    const result = await toolFn(params);
    eventBus.emit('monitor:event', { type: 'tool', source: 'ToolExecutor', action: 'invoke_success', detail: `${module}.${tool}`, ts: Date.now() });
    return result;
  } catch (e) {
    eventBus.emit('monitor:event', { type: 'error', source: 'ToolExecutor', action: 'invoke_error', detail: `${module}.${tool}: ${e.message}`, ts: Date.now() });
    throw e;
  }
}

export function getAvailableTools() {
  return Object.entries(MODULE_TOOLS).reduce((acc, [module, tools]) => {
    acc[module] = Object.keys(tools);
    return acc;
  }, {});
}