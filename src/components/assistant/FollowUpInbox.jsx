import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Mail, MessageSquare, Phone, ClipboardList, Clock, Zap,
  CheckCircle2, Search, Loader2, Send, Copy, X, Check,
  ArrowRight, Inbox, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const typeConfig = {
  email: { icon: Mail, color: "bg-blue-100 text-blue-700", label: "Email" },
  sms: { icon: MessageSquare, color: "bg-emerald-100 text-emerald-700", label: "SMS" },
  call: { icon: Phone, color: "bg-purple-100 text-purple-700", label: "Call" },
  task: { icon: ClipboardList, color: "bg-amber-100 text-amber-700", label: "Task" },
};

const urgencyConfig = {
  immediate: { label: "Now", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  today: { label: "Today", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  this_week: { label: "This Week", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  optional: { label: "Optional", color: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Done", color: "bg-emerald-100 text-emerald-700" },
  dismissed: { label: "Dismissed", color: "bg-slate-100 text-slate-500" },
};

export default function FollowUpInbox({ clientId, agents }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [draftEdit, setDraftEdit] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ["followups", clientId],
    queryFn: () => base44.entities.FollowUp.filter({ client_id: clientId }, "-created_date", 200),
    enabled: !!clientId,
    refetchInterval: 20000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FollowUp.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["followups"] }),
  });

  const filtered = useMemo(() => {
    return followups.filter((f) => {
      if (statusFilter === "active" && (f.status === "completed" || f.status === "dismissed")) return false;
      if (statusFilter === "completed" && f.status !== "completed") return false;
      if (statusFilter === "dismissed" && f.status !== "dismissed") return false;
      if (typeFilter !== "all" && f.type !== typeFilter) return false;
      if (urgencyFilter !== "all" && f.urgency !== urgencyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!f.title?.toLowerCase().includes(q) &&
            !f.description?.toLowerCase().includes(q) &&
            !f.caller_name?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [followups, statusFilter, typeFilter, urgencyFilter, search]);

  const pendingCount = followups.filter((f) => f.status === "pending").length;
  const immediateCount = followups.filter((f) => f.urgency === "immediate" && f.status === "pending").length;
  const todayCount = followups.filter((f) => f.urgency === "today" && f.status === "pending").length;
  const completedCount = followups.filter((f) => f.status === "completed").length;

  const handleStatusChange = (item, newStatus) => {
    const data = { status: newStatus };
    if (newStatus === "completed") data.completed_at = new Date().toISOString();
    updateMutation.mutate({ id: item.id, data });
    toast.success(newStatus === "completed" ? "Marked complete" : `Status: ${newStatus}`);
    if (selectedItem?.id === item.id) setSelectedItem(null);
  };

  const handleSendDraft = async (item) => {
    const content = draftEdit || item.draft_content;
    if (!content?.trim()) { toast.error("No draft content"); return; }

    if (item.type === "email") {
      const recipientEmail = item.caller_contact?.includes("@") ? item.caller_contact : null;
      if (!recipientEmail) { toast.error("No email address available — draft copied to clipboard"); navigator.clipboard.writeText(content); return; }
      const subjectMatch = content.match(/^Subject:\s*(.+)/im);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Follow-up: ${item.title}`;
      const body = subjectMatch ? content.replace(/^Subject:\s*.+\n*/im, "").trim() : content;
      await base44.integrations.Core.SendEmail({ to: recipientEmail, subject, body });
      toast.success(`Email sent to ${recipientEmail}`);
    } else {
      navigator.clipboard.writeText(content);
      toast.success("SMS copied to clipboard");
    }
    handleStatusChange(item, "completed");
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setDraftEdit(item.draft_content || "");
    setNotes(item.notes || "");
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={cn("border-0 shadow-sm", pendingCount > 0 && "bg-amber-50")}>
          <CardContent className="p-3 text-center">
            <p className={cn("text-2xl font-bold", pendingCount > 0 ? "text-amber-600" : "text-slate-400")}>{pendingCount}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm", immediateCount > 0 && "bg-red-50")}>
          <CardContent className="p-3 text-center">
            <p className={cn("text-2xl font-bold", immediateCount > 0 ? "text-red-600" : "text-slate-400")}>{immediateCount}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> Immediate</p>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm", todayCount > 0 && "bg-amber-50")}>
          <CardContent className="p-3 text-center">
            <p className={cn("text-2xl font-bold", todayCount > 0 ? "text-amber-600" : "text-slate-400")}>{todayCount}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Due Today</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-xs text-emerald-600 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search follow-ups..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="task">Task</SelectItem>
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="immediate">Immediate</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="optional">Optional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((item) => {
            const tCfg = typeConfig[item.type] || typeConfig.task;
            const uCfg = urgencyConfig[item.urgency] || urgencyConfig.optional;
            const sCfg = statusConfig[item.status] || statusConfig.pending;
            const TypeIcon = tCfg.icon;
            const agentName = agents?.find((a) => a.id === item.agent_id)?.name;
            return (
              <Card key={item.id} className={cn(
                "border transition-all hover:shadow-md cursor-pointer",
                item.status === "completed" && "opacity-60",
                item.urgency === "immediate" && item.status === "pending" && "border-red-200 bg-red-50/30"
              )} onClick={() => openDetail(item)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg flex-shrink-0", tCfg.color)}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium text-sm text-slate-900 truncate", item.status === "completed" && "line-through")}>{item.title}</p>
                      <Badge className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", uCfg.color)}>{uCfg.label}</Badge>
                      <Badge className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", sCfg.color)}>{sCfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span>{item.caller_name || "Unknown"}</span>
                      {agentName && <><span>·</span><span>{agentName}</span></>}
                      <span>·</span>
                      <span>{moment(item.created_date).fromNow()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {item.status === "pending" && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStatusChange(item, "in_progress")}>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStatusChange(item, "completed")}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStatusChange(item, "dismissed")}>
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </>
                    )}
                    {item.status === "in_progress" && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStatusChange(item, "completed")}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">
              {followups.length === 0 ? "No follow-ups yet — analyze calls to generate them" : "No follow-ups match your filters"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        {selectedItem && (
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {(() => { const I = (typeConfig[selectedItem.type] || typeConfig.task).icon; return <I className="w-5 h-5 text-indigo-600" />; })()}
                <DialogTitle className="text-lg">{selectedItem.title}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("text-xs", (typeConfig[selectedItem.type] || typeConfig.task).color)}>
                  {(typeConfig[selectedItem.type] || typeConfig.task).label}
                </Badge>
                <Badge className={cn("text-xs", (urgencyConfig[selectedItem.urgency] || urgencyConfig.optional).color)}>
                  {(urgencyConfig[selectedItem.urgency] || urgencyConfig.optional).label}
                </Badge>
                <Badge className={cn("text-xs", (statusConfig[selectedItem.status] || statusConfig.pending).color)}>
                  {(statusConfig[selectedItem.status] || statusConfig.pending).label}
                </Badge>
                {selectedItem.call_sentiment && (
                  <Badge variant="outline" className="text-xs capitalize">{selectedItem.call_sentiment}</Badge>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selectedItem.description}</p>
              </div>

              {/* Call context */}
              {selectedItem.call_summary && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Call Context</p>
                  <p className="text-xs text-slate-600 bg-indigo-50 rounded-lg p-2.5 italic">{selectedItem.call_summary}</p>
                </div>
              )}

              {/* Caller info */}
              <div className="flex gap-4 text-sm">
                <div><span className="text-xs text-slate-400">Caller:</span> <span className="font-medium">{selectedItem.caller_name || "Unknown"}</span></div>
                {selectedItem.caller_contact && <div><span className="text-xs text-slate-400">Contact:</span> <span className="font-medium">{selectedItem.caller_contact}</span></div>}
              </div>

              {/* Draft content for email/sms */}
              {(selectedItem.type === "email" || selectedItem.type === "sms") && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Draft {selectedItem.type === "email" ? "Email" : "SMS"}</p>
                  <Textarea
                    value={draftEdit}
                    onChange={(e) => setDraftEdit(e.target.value)}
                    rows={selectedItem.type === "email" ? 8 : 3}
                    className="text-sm"
                    placeholder={`Edit draft ${selectedItem.type}...`}
                  />
                  {selectedItem.type === "sms" && (
                    <p className={cn("text-xs mt-1", draftEdit.length > 160 ? "text-red-500" : "text-slate-400")}>{draftEdit.length}/160</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm"
                  placeholder="Add notes..."
                />
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {selectedItem.status !== "completed" && selectedItem.status !== "dismissed" && (
                <>
                  {(selectedItem.type === "email" || selectedItem.type === "sms") && (
                    <Button size="sm" onClick={() => handleSendDraft(selectedItem)} className="gap-1 bg-indigo-600 hover:bg-indigo-700">
                      <Send className="w-3 h-3" /> Send & Complete
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => {
                    updateMutation.mutate({ id: selectedItem.id, data: { notes, draft_content: draftEdit } });
                    toast.success("Saved");
                  }} className="gap-1">
                    <Check className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedItem, "completed")} className="gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Complete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(selectedItem, "dismissed")} className="gap-1 text-slate-500">
                    <X className="w-3 h-3" /> Dismiss
                  </Button>
                </>
              )}
              {selectedItem.status === "completed" && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed {selectedItem.completed_at ? moment(selectedItem.completed_at).fromNow() : ""}
                </p>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}