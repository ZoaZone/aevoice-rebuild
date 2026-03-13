export function buildPlan(task) {
  const desc = (typeof task === "string" ? task : task?.description) || "";
  return {
    steps: ["analyze", "plan", "execute", "finalize"],
    description: desc
  };
}
export default { buildPlan };