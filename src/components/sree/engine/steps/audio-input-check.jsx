export default async function audioInputCheck(ctx = {}) {
  ctx?.emit?.("progress", { step: "audio-input-check", message: "Checking input" });
  await delay(60);
  return "audio-input-check";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}