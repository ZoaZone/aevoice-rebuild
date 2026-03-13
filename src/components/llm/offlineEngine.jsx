import { trackEvent } from "@/components/telemetry/telemetry";

let modelLoaded = false;
let modelInfo = { name: 'heuristic-offline', size: 'tiny' };

export async function loadModel(opts = {}){
  // Placeholder: simulate load
  modelInfo = { ...modelInfo, ...opts };
  await new Promise(r=>setTimeout(r, 300));
  modelLoaded = true;
  trackEvent('offlineModelLoaded', { name: modelInfo.name });
  return { ok: true, info: modelInfo };
}

export function unloadModel(){ modelLoaded = false; }

export async function runOfflineLLM(prompt, options = {}){
  if (!modelLoaded){
    trackEvent('offlineModelError', { error: 'model_not_loaded' });
    return { ok: false, output: "Offline model not loaded yet.", provider: 'offline' };
  }
  // Very lightweight heuristic response
  let output = '';
  const p = (prompt||'').toLowerCase();
  if (/hello|hi|hey/.test(p)) output = "Hello! (offline) How can I help?";
  else if (/help|how/.test(p)) output = "(offline) Here's a brief answer based on local rules: " + prompt.slice(0,140);
  else output = "(offline) I don't have internet, but here's what I can say: " + prompt.slice(0,200);
  trackEvent('offlineInferenceUsed');
  return { ok: true, output, provider: 'offline' };
}