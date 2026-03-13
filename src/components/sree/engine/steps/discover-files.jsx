export default async function discoverFiles(ctx = {}) {
  ctx?.emit?.("progress", { step: "discover-files", message: "Discovering" });
  await delay(60);
  return "discover-files";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}