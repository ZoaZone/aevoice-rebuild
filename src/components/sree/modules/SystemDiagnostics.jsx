export async function analyze(env) {
  const info = env?.getEnvironmentInfo?.() || { type: "unknown" };
  return {
    environment: info,
    checks: [
      { name: "fileAccess", ok: !!env?.canReadFiles?.(), details: "Read files capability" },
      { name: "commands", ok: !!env?.canRunCommands?.(), details: "Run commands capability" },
    ],
  };
}

export function proposeFixes(analysis) {
  const fixes = [];
  if (!analysis?.checks?.find(c => c.name === "fileAccess")?.ok) {
    fixes.push({ id: "enable-file-access", title: "Enable file access in desktop app" });
  }
  return fixes;
}

export async function applyFixes(fixes) {
  // In this app, fixes are informational only
  return fixes.map(f => ({ id: f.id, applied: false, message: "Manual step may be required" }));
}