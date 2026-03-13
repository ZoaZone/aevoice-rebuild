async function audit(ctx = {}) {
  ctx?.emit?.("progress", { step: "audit", message: "Auditing" });
  await new Promise((r) => setTimeout(r, 100));
  return "Audited";
}

export const run = audit;
export default audit;