export default async function auditMonitor(ctx = {}) {
  ctx?.emit?.("progress", { step: "audit-monitor", message: "Auditing monitor" });
  await delay(60);
  return "audit-monitor";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}