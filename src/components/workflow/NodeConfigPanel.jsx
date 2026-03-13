import { getNodeDef, CATEGORY_COLORS } from "./nodeTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NodeConfigPanel({ node, onUpdate, onDelete, onClose }) {
  if (!node) return null;
  const def = getNodeDef(node.type);
  const colors = CATEGORY_COLORS[def.categoryColor];
  const Icon = def.icon;

  const updateConfig = (key, value) => {
    onUpdate(node.id, { config: { ...node.config, [key]: value } });
  };
  const updateLabel = (value) => {
    onUpdate(node.id, { label: value });
  };

  return (
    <div className="w-72 border-l border-slate-200 bg-white flex flex-col flex-shrink-0">
      {/* Header */}
      <div className={cn("flex items-center gap-2 px-4 py-3 border-b", colors.bg)}>
        <div className={cn("p-1.5 rounded-md", colors.iconBg)}>
          <Icon className={cn("w-4 h-4", colors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{def.label}</div>
          <div className="text-[10px] text-slate-500">{def.category}</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/60"><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      {/* Config form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Node Label</Label>
          <Input value={node.label || ""} onChange={(e) => updateLabel(e.target.value)} placeholder={def.label} className="text-sm" />
        </div>

        {/* Trigger configs */}
        {node.type === "trigger_webhook" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook Path</Label>
            <Input value={node.config?.path || ""} onChange={(e) => updateConfig("path", e.target.value)} placeholder="/my-webhook" className="text-sm font-mono" />
          </div>
        )}
        {node.type === "trigger_schedule" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Cron Expression</Label>
            <Input value={node.config?.cron || ""} onChange={(e) => updateConfig("cron", e.target.value)} placeholder="0 9 * * 1-5" className="text-sm font-mono" />
            <p className="text-[10px] text-slate-400">e.g. 0 9 * * 1-5 = weekdays at 9am</p>
          </div>
        )}

        {/* AI configs */}
        {(node.type === "ai_respond" || node.type === "ai_classify" || node.type === "ai_extract") && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Prompt / Instructions</Label>
              <Textarea value={node.config?.prompt || ""} onChange={(e) => updateConfig("prompt", e.target.value)} placeholder="Describe what the AI should do..." rows={4} className="text-sm" />
            </div>
            {node.type === "ai_classify" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Categories (comma-separated)</Label>
                <Input value={node.config?.categories || ""} onChange={(e) => updateConfig("categories", e.target.value)} placeholder="sales, support, billing, other" className="text-sm" />
              </div>
            )}
            {node.type === "ai_extract" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Fields to Extract (comma-separated)</Label>
                <Input value={node.config?.fields || ""} onChange={(e) => updateConfig("fields", e.target.value)} placeholder="name, email, phone, issue" className="text-sm" />
              </div>
            )}
          </>
        )}

        {/* Condition */}
        {node.type === "condition" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Variable</Label>
              <Input value={node.config?.variable || ""} onChange={(e) => updateConfig("variable", e.target.value)} placeholder="{{intent}}" className="text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Operator</Label>
              <Select value={node.config?.operator || "equals"} onValueChange={(v) => updateConfig("operator", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Value</Label>
              <Input value={node.config?.value || ""} onChange={(e) => updateConfig("value", e.target.value)} placeholder="sales" className="text-sm" />
            </div>
          </>
        )}

        {/* Action configs */}
        {node.type === "send_sms" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">To Number</Label>
              <Input value={node.config?.to || ""} onChange={(e) => updateConfig("to", e.target.value)} placeholder="{{caller_number}}" className="text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message Body</Label>
              <Textarea value={node.config?.body || ""} onChange={(e) => updateConfig("body", e.target.value)} placeholder="Hi {{name}}, thanks for calling!" rows={3} className="text-sm" />
            </div>
          </>
        )}
        {node.type === "send_email" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input value={node.config?.to || ""} onChange={(e) => updateConfig("to", e.target.value)} placeholder="{{customer_email}}" className="text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input value={node.config?.subject || ""} onChange={(e) => updateConfig("subject", e.target.value)} placeholder="Follow-up from {{business_name}}" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Body</Label>
              <Textarea value={node.config?.body || ""} onChange={(e) => updateConfig("body", e.target.value)} rows={4} className="text-sm" />
            </div>
          </>
        )}
        {node.type === "delay" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Delay (minutes)</Label>
            <Input type="number" value={node.config?.minutes || ""} onChange={(e) => updateConfig("minutes", parseInt(e.target.value) || 0)} placeholder="5" className="text-sm" />
          </div>
        )}
        {node.type === "transfer_call" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Transfer To</Label>
            <Input value={node.config?.number || ""} onChange={(e) => updateConfig("number", e.target.value)} placeholder="+1234567890" className="text-sm font-mono" />
          </div>
        )}

        {/* API / Integration configs */}
        {node.type === "api_call" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={node.config?.method || "GET"} onValueChange={(v) => updateConfig("method", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL</Label>
              <Input value={node.config?.url || ""} onChange={(e) => updateConfig("url", e.target.value)} placeholder="https://api.example.com/endpoint" className="text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Headers (JSON)</Label>
              <Textarea value={node.config?.headers || ""} onChange={(e) => updateConfig("headers", e.target.value)} placeholder='{"Authorization": "Bearer ..."}' rows={2} className="text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Body (JSON)</Label>
              <Textarea value={node.config?.body || ""} onChange={(e) => updateConfig("body", e.target.value)} placeholder='{"key": "{{value}}"}' rows={3} className="text-sm font-mono" />
            </div>
          </>
        )}
        {node.type === "webhook_send" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook URL</Label>
            <Input value={node.config?.url || ""} onChange={(e) => updateConfig("url", e.target.value)} placeholder="https://hooks.zapier.com/..." className="text-sm font-mono" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200">
        <Button variant="destructive" size="sm" className="w-full gap-1.5" onClick={() => onDelete(node.id)}>
          <Trash2 className="w-3.5 h-3.5" /> Delete Node
        </Button>
      </div>
    </div>
  );
}