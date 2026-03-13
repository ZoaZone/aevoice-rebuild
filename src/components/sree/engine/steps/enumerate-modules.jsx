export default async function enumerateModules(ctx = {}) {
  ctx?.emit?.("progress", { step: "enumerate-modules", message: "Enumerating" });
  await delay(70);
  return "enumerate-modules";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}