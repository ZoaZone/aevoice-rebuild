export default async function finalizeScan(ctx = {}) {
  ctx?.emit?.("progress", { step: "finalize-scan", message: "Finishing scan" });
  await delay(50);
  return "init scan complete";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}