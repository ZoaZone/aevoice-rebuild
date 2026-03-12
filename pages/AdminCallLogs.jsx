import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Download, FileText, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AdminCallLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['adminCallLogs'],
    queryFn: () => base44.entities.CallLog.list({ sort: { started_at: -1 }, limit: 50 }),
  });

  const [selectedLog, setSelectedLog] = useState(null);

  if (isLoading) return <div className="p-8 text-center">Loading logs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Call Logs & Recordings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          {logs?.map((log) => (
            <Card 
              key={log.id} 
              className={`cursor-pointer hover:border-blue-500 transition-colors ${selectedLog?.id === log.id ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setSelectedLog(log)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>
                    {log.status}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {log.started_at ? format(new Date(log.started_at), 'MMM d, HH:mm') : 'N/A'}
                  </span>
                </div>
                <div className="text-sm font-medium">{log.from_number} → {log.to_number}</div>
                {log.transcript_language && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {log.transcript_language}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedLog ? (
            <Card>
              <CardHeader>
                <CardTitle>Call Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-500">Duration</span>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {selectedLog.duration_seconds || 0}s
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Language</span>
                    <p className="font-medium">{selectedLog.transcript_language || 'Unknown'}</p>
                  </div>
                </div>

                {selectedLog.recording_url && (
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" /> Recording
                    </h3>
                    <audio controls src={selectedLog.recording_url} className="w-full" />
                    <Button variant="link" className="mt-2 p-0 h-auto" asChild>
                      <a href={selectedLog.recording_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" /> Download Audio
                      </a>
                    </Button>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Transcript
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-lg border text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {selectedLog.transcript || "No transcript available."}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed">
              Select a call log to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}