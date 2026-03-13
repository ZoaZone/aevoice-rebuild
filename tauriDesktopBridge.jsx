/**
 * AEVOICE Desktop Bridge
 * ──────────────────────
 * Provides a unified API for the Sree engine and React components to call
 * Tauri IPC commands. Falls back gracefully to no-ops in the browser.
 *
 * Usage:
 *   import { desktopBridge } from '@/components/desktop/tauriDesktopBridge';
 *   const mode = await desktopBridge.getAssistantMode();
 */

const isTauri = () =>
  typeof window !== 'undefined' && Boolean(window.__TAURI__);

/**
 * Safe invoke wrapper — returns null instead of throwing in the browser.
 */
async function invoke(command, args = {}) {
  if (!isTauri()) return null;
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return await tauriInvoke(command, args);
  } catch (err) {
    console.warn(`[DesktopBridge] invoke(${command}) failed:`, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Assistant Mode
// ─────────────────────────────────────────────────────────────────────────────

export async function getAssistantMode() {
  const res = await invoke('get_assistant_mode');
  return res?.data ?? null;
}

export async function setAssistantMode(mode) {
  const res = await invoke('set_assistant_mode', { mode });
  return res?.success ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flags
// ─────────────────────────────────────────────────────────────────────────────

export async function getFeatureFlags() {
  const res = await invoke('get_feature_flags');
  return res?.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Base
// ─────────────────────────────────────────────────────────────────────────────

export async function kbRetrieval({ query, clientId, topK = 5, threshold = 0.7 }) {
  const res = await invoke('kb_retrieval', {
    request: { query, client_id: clientId, top_k: topK, threshold },
  });
  return res?.data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Proxy
// ─────────────────────────────────────────────────────────────────────────────

export async function llmProxy({
  prompt,
  model = 'gpt-4o-mini',
  temperature = 0.7,
  maxTokens = 1000,
  systemPrompt,
  responseJsonSchema,
  addContextFromInternet = false,
  fileUrls = [],
}) {
  const res = await invoke('llm_proxy', {
    request: {
      prompt,
      model,
      temperature,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
      response_json_schema: responseJsonSchema,
      add_context_from_internet: addContextFromInternet,
      file_urls: fileUrls,
    },
  });
  return res?.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyClient() {
  const res = await invoke('get_my_client');
  return res?.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sree Auto-Scan
// ─────────────────────────────────────────────────────────────────────────────

export async function sreeAutoScan(scanTarget = 'full') {
  const res = await invoke('sree_auto_scan_service', { scanTarget });
  return res?.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Backend Passthrough
// ─────────────────────────────────────────────────────────────────────────────

export async function invokeBackend(functionName, payload = {}, authToken) {
  const res = await invoke('invoke_backend', {
    request: { function_name: functionName, payload, auth_token: authToken },
  });
  return res?.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Secure Credential Store (OS Keychain)
// ─────────────────────────────────────────────────────────────────────────────

export async function secureSet(key, value) {
  const res = await invoke('secure_store_set', { key, value });
  return res?.success ?? false;
}

export async function secureGet(key) {
  const res = await invoke('secure_store_get', { key });
  return res?.data ?? null;
}

export async function secureDelete(key) {
  const res = await invoke('secure_store_delete', { key });
  return res?.success ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// App Info
// ─────────────────────────────────────────────────────────────────────────────

export async function getAppInfo() {
  const res = await invoke('get_app_info');
  return res?.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DevTools
// ─────────────────────────────────────────────────────────────────────────────

export async function openDevtools() {
  await invoke('open_devtools');
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

export { isTauri };

/**
 * Default export: grouped API object for convenience
 */
const desktopBridge = {
  isTauri,
  getAssistantMode,
  setAssistantMode,
  getFeatureFlags,
  kbRetrieval,
  llmProxy,
  getMyClient,
  sreeAutoScan,
  invokeBackend,
  secureSet,
  secureGet,
  secureDelete,
  getAppInfo,
  openDevtools,
};

export default desktopBridge;