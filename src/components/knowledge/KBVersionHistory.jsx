import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import moment from "moment";

export default function KBVersionHistory({ kb, chunks }) {
  const queryClient = useQueryClient();

  const createSnapshot = async (notes = "") => {
    const currentVersion = kb.version || 1;
    const newVersion = currentVersion + 1;
    const history = kb.version_history || [];
    
    history.push({
      version: currentVersion,
      created_at: new Date().toISOString(),
      chunk_count: chunks?.length || kb.chunk_count || 0,
      total_words: kb.total_words || 0,
      notes: notes || `Snapshot v${currentVersion}`,
      snapshot_type: "manual",
    });

    await base44.entities.KnowledgeBase.update(kb.id, {
      version: newVersion,
      version_history: history,
    });

    queryClient.invalidateQueries({ queryKey: ["knowledgeBases"] });
    toast.success(`Version snapshot saved (v${currentVersion} → v${newVersion})`);
  };

  const versions = (kb.version_history || []).slice().reverse();

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            Version History
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">v{kb.version || 1}</Badge>
            <Button size="sm" variant="outline" onClick={() => createSnapshot()} className="gap-1">
              <Save className="w-3 h-3" /> Snapshot
            </Button>
          </div>
        </div>

        {versions.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {versions.map((v, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-white border border-indigo-100">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">v{v.version}</Badge>
                  <span className="text-slate-600 text-xs">{v.notes}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{v.chunk_count} chunks</span>
                  <span>{moment(v.created_at).format("MMM D, h:mm A")}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">
            No version history yet. Click "Snapshot" to save the current state.
          </p>
        )}
      </CardContent>
    </Card>
  );
}