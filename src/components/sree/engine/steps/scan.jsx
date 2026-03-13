async function scan(ctx = {}) {
  ctx?.emit?.("progress", { step: "scan", message: "Scanning" });
  await new Promise((r) => setTimeout(r, 100));
  return "Scanned";
}

export const run = scan;
export default scan;