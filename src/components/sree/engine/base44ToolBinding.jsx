import { base44 } from '@/api/base44Client';
import eventBus from '@/components/sree/engine/eventBus';

// ═══════════════════════════════════════════════════════════════
// BASE44 ABSTRACT TOOL BINDING
// ═══════════════════════════════════════════════════════════════

export const BASE44_TOOLS = {
  // File operations
  File: {
    read: async (path) => {
      try {
        const res = await base44.functions.invoke('kbRetrieval', { query: path, limit: 1 });
        eventBus.emit('monitor:event', { type: 'tool', source: 'ToolBinding', action: 'file_read', detail: path, ts: Date.now() });
        return res?.data?.chunks?.[0]?.content || '';
      } catch (e) {
        eventBus.emit('monitor:event', { type: 'error', source: 'ToolBinding', action: 'file_read_error', detail: e.message, ts: Date.now() });
        throw e;
      }
    },
    write: () => {
      const msg = 'File.write is DISABLED in Base44 environment';
      eventBus.emit('monitor:event', { type: 'blocked', source: 'ToolBinding', action: 'file_write_blocked', detail: msg, ts: Date.now() });
      throw new Error(msg);
    },
  },

  // HTTP/RPC operations
  HTTP: {
    request: async (method, path, params) => {
      try {
        const fnName = path.split('/').pop();
        const res = await base44.functions.invoke(fnName, params || {});
        eventBus.emit('monitor:event', { type: 'tool', source: 'ToolBinding', action: 'http_request', detail: `${method} ${path}`, ts: Date.now() });
        return res?.data || res;
      } catch (e) {
        eventBus.emit('monitor:event', { type: 'error', source: 'ToolBinding', action: 'http_error', detail: e.message, ts: Date.now() });
        throw e;
      }
    },
  },

  // Database operations
  DB: {
    query: async (entityName, filter = {}, limit = 50) => {
      try {
        const entity = base44.entities[entityName];
        if (!entity) throw new Error(`Entity not found: ${entityName}`);
        const results = await entity.filter(filter).catch(() => []);
        eventBus.emit('monitor:event', { type: 'tool', source: 'ToolBinding', action: 'db_query', detail: `${entityName} (${results.length})`, ts: Date.now() });
        return results.slice(0, limit);
      } catch (e) {
        eventBus.emit('monitor:event', { type: 'error', source: 'ToolBinding', action: 'db_query_error', detail: e.message, ts: Date.now() });
        throw e;
      }
    },
    mutate: async (entityName, action, data) => {
      try {
        const entity = base44.entities[entityName];
        if (!entity) throw new Error(`Entity not found: ${entityName}`);
        let result;
        if (action === 'create') result = await entity.create(data);
        else if (action === 'update') result = await entity.update(data.id, data);
        else if (action === 'delete') result = await entity.delete(data.id);
        else throw new Error(`Unknown action: ${action}`);
        eventBus.emit('monitor:event', { type: 'tool', source: 'ToolBinding', action: 'db_mutate', detail: `${entityName}.${action}`, ts: Date.now() });
        return result;
      } catch (e) {
        eventBus.emit('monitor:event', { type: 'error', source: 'ToolBinding', action: 'db_mutate_error', detail: e.message, ts: Date.now() });
        throw e;
      }
    },
  },

  // Browser operations (disabled in Base44)
  Browser: {
    inspect: () => {
      const msg = 'Browser.inspect is DISABLED in Base44 environment';
      eventBus.emit('monitor:event', { type: 'blocked', source: 'ToolBinding', action: 'browser_inspect_blocked', detail: msg, ts: Date.now() });
      throw new Error(msg);
    },
    act: () => {
      const msg = 'Browser.act is DISABLED in Base44 environment';
      eventBus.emit('monitor:event', { type: 'blocked', source: 'ToolBinding', action: 'browser_act_blocked', detail: msg, ts: Date.now() });
      throw new Error(msg);
    },
  },

  // Voice operations (disabled in Base44)
  Voice: {
    listen: () => {
      const msg = 'Voice.listen is DISABLED in Base44 environment';
      eventBus.emit('monitor:event', { type: 'blocked', source: 'ToolBinding', action: 'voice_listen_blocked', detail: msg, ts: Date.now() });
      throw new Error(msg);
    },
    speak: () => {
      const msg = 'Voice.speak is DISABLED in Base44 environment';
      eventBus.emit('monitor:event', { type: 'blocked', source: 'ToolBinding', action: 'voice_speak_blocked', detail: msg, ts: Date.now() });
      throw new Error(msg);
    },
  },

  // UI output
  UI: {
    show: (panel, content) => {
      eventBus.emit('sree:panel', { panel, content, ts: Date.now() });
      eventBus.emit('monitor:event', { type: 'ui', source: 'ToolBinding', action: 'ui_show', detail: `${panel}:${typeof content}`, ts: Date.now() });
      return true;
    },
  },

  // Logging
  Log: {
    stream: (level, message, data = {}) => {
      eventBus.emit('monitor:event', { type: level, source: 'ToolBinding', action: 'log_stream', detail: message, data, ts: Date.now() });
      return true;
    },
  },
};

// Tool status registry
export const TOOL_STATUS = {
  bound: true,
  environment: 'web/base44',
  timestamp: new Date().toISOString(),
};

export function getBoundTool(category, toolName) {
  return BASE44_TOOLS[category]?.[toolName];
}

export function getToolStatus() {
  return TOOL_STATUS;
}