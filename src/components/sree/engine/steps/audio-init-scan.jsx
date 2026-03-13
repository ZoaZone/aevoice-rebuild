export default async function audioInitScan(ctx = {}) {
  ctx?.emit?.("progress", { step: "audio-init-scan", message: "Scanning audio init" });
  await delay(60);
  return "audio-init-scan";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}