// ═══════════════════════════════════════════════════════════════
// INTENT ROUTER — maps natural language → Developer Aeva module
// ═══════════════════════════════════════════════════════════════

const INTENT_MAP = [
  {
    module: "PlatformDiagnostics",
    patterns: [
      /diagnose/i, /\bcheck\b/i, /\bstatus\b/i, /capabilities/i,
      /test docx/i, /test voice/i, /test pipeline/i,
    ],
  },
  {
    module: "AgentOrchestrator",
    patterns: [/repair agent/i, /fix agent/i, /agent issue/i],
  },
  {
    module: "KBManager",
    patterns: [/clean kb/i, /dedupe kb/i, /remove duplicates/i],
  },
  {
    module: "Validator",
    patterns: [/rls check/i, /client_id/i, /created_by/i],
  },
  {
    module: "CodeReader",
    patterns: [/open file/i, /read file/i, /show file/i],
  },
  {
    module: "CodeWriter",
    patterns: [/propose patch/i, /modify file/i, /write code/i],
  },
  {
    module: "RepoNavigator",
    patterns: [/navigate repo/i, /list files/i],
  },
  {
    module: "LogInspector",
    patterns: [/inspect logs/i, /show logs/i],
  },
  {
    module: "WorkflowPlanner",
    patterns: [/run workflow/i, /multi.?step/i],
  },
  {
    module: "MultiStepExecutor",
    patterns: [/multi.?step/i],
  },
];

/**
 * Route a natural language input to a Developer Aeva module.
 * @param {string} input
 * @returns {{ module: string, matched: true } | { error: "NO_INTENT_MATCH", message: string }}
 */
export function routeIntent(input = "") {
  const text = String(input).trim();

  for (const { module, patterns } of INTENT_MAP) {
    if (patterns.some((re) => re.test(text))) {
      return { module, matched: true };
    }
  }

  return {
    error: "NO_INTENT_MATCH",
    message: "I could not map your request to a developer module.",
  };
}

export const MODULES_MAPPED = INTENT_MAP.map((e) => e.module);

export default routeIntent;