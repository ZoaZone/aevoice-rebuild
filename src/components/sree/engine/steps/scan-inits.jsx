export default async function scanInits(ctx = {}) {
  ctx?.emit?.("progress", { step: "scan-inits", message: "Scanning inits" });
  await delay(60);
  return "scan-inits";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}