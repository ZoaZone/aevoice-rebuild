export default async function checkInitExports(ctx = {}) {
  ctx?.emit?.("progress", { step: "check-init-exports", message: "Checking init exports" });
  await delay(70);
  return "check-init-exports";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}