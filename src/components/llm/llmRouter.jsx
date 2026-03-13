import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/components/telemetry/telemetry";

async function tryBase44(prompt, options = {}) {
  try {
    const { model, add_context_from_internet, response_json_schema, file_urls } = options || {};
    const out = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: Boolean(add_context_from_internet),
      response_json_schema: response_json_schema || null,
      file_urls: file_urls || null,
    });
    const text = typeof out === 'string' ? out : (out?.output || out?.text || JSON.stringify(out));
    return { ok: true, output: text, provider: 'base44' };
  } catch (err) {
    return { ok: false, error: err?.message || 'base44_error', provider: 'base44' };
  }
}

async function tryProxy(prompt, provider, options = {}) {
  try {
    const res = await base44.functions.invoke('llmProxy', { provider, prompt, options });
    if (res?.data?.ok) {
      return { ok: true, output: res.data.output, provider };
    }
    return { ok: false, error: res?.data?.error || 'proxy_error', provider };
  } catch (err) {
    return { ok: false, error: err?.message || 'proxy_invoke_error', provider };
  }
}

export async function runLLM(prompt, options = {}) {
  if (window.SREE_DEBUG) {
    console.log('[llmRouter] Starting LLM request', {
      promptLength: prompt?.length || 0,
      options
    });
  }
  
  // 1) Offline local model FIRST (offline-first strategy)
  try {
    if (window.SREE_DEBUG) {
      console.log('[llmRouter] Attempting offline model first...');
    }
    const { runOfflineLLM, loadModel } = await import("@/components/llm/offlineEngine");
    await loadModel();
    const off = await runOfflineLLM(prompt, options);
    if (off?.ok) {
      if (window.SREE_DEBUG) {
        console.log('[llmRouter] ✓ Offline model success', { outputLength: off.output?.length });
      }
      trackEvent('llmProviderUsed', { provider: 'offline' });
      return off;
    }
  } catch (e) {
    if (window.SREE_DEBUG) {
      console.warn('[llmRouter] Offline model not available/failed:', e?.message);
    }
    trackEvent('llmError', { provider: 'offline', error: e?.message || 'offline_error' });
  }

  // 2) Base44 (cloud) as secondary
  const b44 = await tryBase44(prompt, options);
  if (b44.ok) {
    if (window.SREE_DEBUG) {
      console.log('[llmRouter] ✓ Base44 success', { outputLength: b44.output?.length });
    }
    trackEvent('llmProviderUsed', { provider: 'base44' });
    return b44;
  }
  if (window.SREE_DEBUG) {
    console.warn('[llmRouter] ✗ Base44 failed:', b44.error);
  }
  trackEvent('llmError', { provider: 'base44', error: b44.error });

  // 3) OpenAI as final fallback
  const oai = await tryProxy(prompt, 'openai', options);
  if (oai.ok) {
    if (window.SREE_DEBUG) {
      console.log('[llmRouter] ✓ OpenAI success', { outputLength: oai.output?.length });
    }
    trackEvent('llmProviderUsed', { provider: 'openai' });
    return oai;
  }
  if (window.SREE_DEBUG) {
    console.warn('[llmRouter] ✗ OpenAI failed:', oai.error);
  }
  trackEvent('llmError', { provider: 'openai', error: oai.error });

  // 4) Graceful fallback
  if (window.SREE_DEBUG) {
    console.error('[llmRouter] ✗ All providers failed, using fallback message');
  }
  const fallback = "I'm having trouble reaching the AI right now. Please try again.";
  return { ok: false, provider: 'none', error: 'all_providers_failed', output: fallback };
}

/**
 * Debug provider availability
 * @returns {Object} Provider status information
 */
export function debugProvider() {
  const state = {
    base44Available: Boolean(base44?.integrations?.Core?.InvokeLLM),
    proxyFunctionAvailable: Boolean(base44?.functions?.invoke),
    offlineEngineLoaded: false, // Will be updated after import
    debug: Boolean(window?.SREE_DEBUG)
  };
  
  // Check if offline engine is available
  import("@/components/llm/offlineEngine").then(() => {
    state.offlineEngineLoaded = true;
  }).catch(() => {
    state.offlineEngineLoaded = false;
  });
  
  if (window?.SREE_DEBUG) {
    console.log('[llmRouter] Provider Debug:', state);
  }
  
  return state;
}