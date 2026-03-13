export default async function audioOutputCheck(ctx = {}) {
  ctx?.emit?.("progress", { step: "audio-output-check", message: "Checking output" });
  await delay(60);
  return "audio-output-check";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}