const DEFAULT_CONFIG = { knowledge: { enabled: true }, voice: { enabled: true } };

export function findConfigFiles() {
  return ["sree.config.json", ".sree.json", "aevoice.sree.json"];
}

export function loadConfig() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem("sree_config") : null;
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function validateConfig(cfg) {
  return typeof cfg === "object" && cfg !== null;
}

export function proposeFixes(cfg) {
  const fixes = [];
  if (!cfg?.knowledge) fixes.push({ id: "add-knowledge", title: "Enable knowledge settings" });
  return fixes;
}

export async function applyFixes(fixes) {
  return fixes.map(f => ({ id: f.id, applied: true }));
}