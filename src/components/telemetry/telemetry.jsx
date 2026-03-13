import { base44 } from "@/api/base44Client";

let queue = [];
let flushing = false;
let lastFlush = 0;
const FLUSH_MS = 3000;
let failCount = 0;
let backoffMs = 0;
let offlineSince = 0;

export function trackEvent(eventName, properties = {}) {
  queue.push({ eventName, properties, ts: Date.now() });
}

async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, queue.length);
  try {
    for (const evt of batch) {
      await base44.analytics.track({ eventName: evt.eventName, properties: evt.properties });
    }
    failCount = 0; backoffMs = 0; if (offlineSince) offlineSince = 0;
  } catch (_) {
    // Put back for retry on failure with backoff
    queue = batch.concat(queue);
    failCount += 1;
    backoffMs = Math.min(30000, (backoffMs || 1000) * 2);
    if (!offlineSince) offlineSince = Date.now();
    if (Date.now() - offlineSince > 60000) { queue = []; offlineSince = 0; }
  } finally {
    flushing = false;
    lastFlush = Date.now();
  }
}

setInterval(() => { if (backoffMs && Date.now() - lastFlush < backoffMs) return; flush(); }, FLUSH_MS);

// Optional: lightweight FPS monitor
let lastFrame = performance.now();
let frames = 0; let lastReport = performance.now();
function raf(){
  frames += 1;
  const now = performance.now();
  if (now - lastReport >= 3000){
    const fps = Math.round((frames * 1000) / (now - lastReport));
    trackEvent('perfMetrics', {
      fps,
      memory_mb: (performance?.memory?.usedJSHeapSize||0) / (1024*1024)
    });
    frames = 0; lastReport = now;
  }
  requestAnimationFrame(raf);
}
if (typeof window !== 'undefined') requestAnimationFrame(raf);