export default async function finalizeAudit(ctx = {}) {
  ctx?.emit?.("progress", { step: "finalize-audit", message: "Wrapping up" });
  await delay(50);
  return "mic/speaker audit complete";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}