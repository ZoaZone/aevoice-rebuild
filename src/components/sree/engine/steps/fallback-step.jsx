export default async function fallbackStep(ctx = {}) {
  ctx?.emit?.("progress", { step: "fallback-step", message: "Running fallback" });
  await delay(60);
  return { __emitDone: true, result: "fallback executed" };
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}