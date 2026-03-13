export default async function reportMissing(ctx = {}) {
  ctx?.emit?.("progress", { step: "report-missing", message: "Reporting" });
  await delay(70);
  return "report-missing";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}