import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from "@/api/base44Client";
import { Play, Loader2, CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNodeDef, CATEGORY_COLORS } from "./nodeTypes";

export default function WorkflowTestPanel({ nodes, edges, onClose }) {
  const [testInput, setTestInput] = useState('{\n  "caller_number": "+15551234567",\n  "message": "I need to schedule an appointment"\n}');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const runTest = async () => {
    setRunning(true);
    setResults(null);

    let input;
    try { input = JSON.parse(testInput); } catch { input = { raw: testInput }; }

    // Simulate execution by walking the graph
    const stepResults = [];
    const visited = new Set();
    const triggerNodes = nodes.filter(n => n.type.startsWith("trigger_"));
    const queue = triggerNodes.length ? [triggerNodes[0].id] : (nodes.length ? [nodes[0].id] : []);

    let context = { ...input };
    const startTime = Date.now();

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const def = getNodeDef(node.type);
      const stepStart = Date.now();
      let status = "success";
      let output = {};
      let error = null;

      try {
        if (node.type === "ai_respond" || node.type === "ai_classify" || node.type === "ai_extract") {
          const prompt = node.config?.prompt
            ? node.config.prompt.replace(/\{\{(\w+)\}\}/g, (_, k) => context[k] || `{{${k}}}`)
            : `Process this: ${JSON.stringify(context)}`;

          const schema = node.type === "ai_classify"
            ? { type: "object", properties: { category: { type: "string" }, confidence: { type: "number" } } }
            : node.type === "ai_extract"
            ? { type: "object", properties: Object.fromEntries((node.config?.fields || "name,email").split(",").map(f => [f.trim(), { type: "string" }])) }
            : null;

          const res = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: schema,
          });
          output = typeof res === "string" ? { response: res } : res;
          context = { ...context, ...output };
        } else if (node.type === "condition") {
          const val = context[node.config?.variable?.replace(/\{\{|\}\}/g, "")] || "";
          const op = node.config?.operator || "equals";
          const cmpVal = node.config?.value || "";
          const passed =
            op === "equals" ? val === cmpVal :
            op === "contains" ? String(val).includes(cmpVal) :
            op === "not_equals" ? val !== cmpVal :
            op === "greater_than" ? Number(val) > Number(cmpVal) :
            op === "less_than" ? Number(val) < Number(cmpVal) : false;
          output = { passed, variable: node.config?.variable, value: val };
          context.__condition_result = passed;
        } else if (node.type === "api_call") {
          output = { simulated: true, method: node.config?.method || "GET", url: node.config?.url, note: "Dry-run: API not actually called in test mode" };
        } else {
          output = { simulated: true, config: node.config, note: "Dry-run simulation" };
        }
      } catch (err) {
        status = "error";
        error = err.message || String(err);
      }

      stepResults.push({
        nodeId: node.id,
        type: node.type,
        label: node.label || def.label,
        status,
        output,
        error,
        durationMs: Date.now() - stepStart,
      });

      // Follow edges
      const outEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outEdges) {
        if (edge.condition && context.__condition_result === false) continue;
        queue.push(edge.target);
      }
    }

    setResults({ steps: stepResults, totalMs: Date.now() - startTime, context });
    setRunning(false);
  };

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-slate-700">Test & Debug</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Close</Button>
      </div>
      <div className="flex divide-x divide-slate-200" style={{ height: 280 }}>
        {/* Input */}
        <div className="w-1/3 p-3 flex flex-col gap-2">
          <Label className="text-xs">Test Input (JSON)</Label>
          <Textarea value={testInput} onChange={(e) => setTestInput(e.target.value)} className="flex-1 text-xs font-mono resize-none" />
          <Button onClick={runTest} disabled={running || nodes.length === 0} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {running ? "Running..." : "Run Test"}
          </Button>
        </div>
        {/* Results */}
        <ScrollArea className="flex-1 p-3">
          {!results && !running && (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              Click "Run Test" to execute the workflow
            </div>
          )}
          {running && (
            <div className="flex items-center justify-center h-full gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Executing nodes...
            </div>
          )}
          {results && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="w-3 h-3" /> {results.totalMs}ms
                </Badge>
                <Badge variant={results.steps.every(s => s.status === "success") ? "default" : "destructive"} className="text-[10px]">
                  {results.steps.filter(s => s.status === "success").length}/{results.steps.length} passed
                </Badge>
              </div>
              {results.steps.map((step, i) => {
                const def = getNodeDef(step.type);
                const colors = CATEGORY_COLORS[def.categoryColor];
                return (
                  <details key={i} className="group border rounded-lg">
                    <summary className={cn("flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-xs", step.status === "error" && "bg-red-50")}>
                      {step.status === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                      <span className={cn("font-medium", colors.text)}>{step.label}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 group-open:rotate-90 transition-transform ml-auto" />
                      <span className="text-slate-400">{step.durationMs}ms</span>
                    </summary>
                    <div className="px-3 pb-2">
                      <pre className="text-[10px] bg-slate-50 p-2 rounded overflow-auto max-h-32 text-slate-600">
                        {step.error ? step.error : JSON.stringify(step.output, null, 2)}
                      </pre>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}