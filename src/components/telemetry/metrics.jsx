export function samplePerformance() {
  try {
    const mem = performance?.memory;
    const memoryMB = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null;
    const cpu = null; // Not available in browser reliably; desktop can wire later
    return { memoryMB, cpu };
  } catch {
    return { memoryMB: null, cpu: null };
  }
}