import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ArrowRight,
  Bot,
  Zap,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InstallationStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const installationId = urlParams.get('id');

  const { data: automationRuns = [], refetch } = useQuery({
    queryKey: ['automationRuns', installationId],
    queryFn: async () => {
      if (installationId) {
        return await base44.entities.AutomationRun.filter({ installation_id: installationId });
      }
      return await base44.entities.AutomationRun.list('-created_date', 10);
    },
    refetchInterval: (data) => {
      // Auto-refresh every 3 seconds if any automation is processing
      const hasProcessing = data?.some(run => run.status === 'processing');
      return hasProcessing ? 3000 : false;
    }
  });

  const automationRun = automationRuns[0];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'processing': return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (!automationRun && installationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Automation Starting...</h2>
            <p className="text-slate-600">Your installation automation will begin shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!automationRun) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Installation Status</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No automation runs found</p>
            <Link to={createPageUrl("InstallationService")}>
              <Button className="mt-4">Start New Installation</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeLabels = {
    'aevoice_installation': '$50 AEVOICE Installation',
    'hellobiz_whiteglove': '$100 HelloBiz White Glove',
    'free_partner': 'Free Partner Agent'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Installation Status</h1>
          <p className="text-slate-500 mt-1">{typeLabels[automationRun.type] || automationRun.type}</p>
        </div>
        <Badge className={cn("text-sm", getStatusColor(automationRun.status))}>
          {automationRun.status.toUpperCase()}
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card className={cn(
        "border-2",
        automationRun.status === 'completed' ? "border-green-200 bg-green-50" :
        automationRun.status === 'processing' ? "border-blue-200 bg-blue-50" :
        automationRun.status === 'failed' ? "border-red-200 bg-red-50" :
        "border-slate-200"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon(automationRun.status)}
            {automationRun.status === 'completed' ? 'Setup Complete!' :
             automationRun.status === 'processing' ? 'Installation in Progress...' :
             automationRun.status === 'failed' ? 'Installation Failed' :
             'Pending'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-slate-700">
                Step {automationRun.current_step} of {automationRun.total_steps}
              </span>
              <span className="text-slate-500">{automationRun.progress_percentage}%</span>
            </div>
            <Progress value={automationRun.progress_percentage} className="h-3" />
          </div>

          {automationRun.status === 'completed' && automationRun.created_agent_id && (
            <div className="flex gap-3 pt-4">
              <Link to={createPageUrl("Dashboard")} className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Bot className="w-4 h-4 mr-2" />
                  View Agent Dashboard
                </Button>
              </Link>
              <Link to={createPageUrl("Agents")} className="flex-1">
                <Button variant="outline" className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Configure Agent
                </Button>
              </Link>
            </div>
          )}

          {automationRun.status === 'processing' && (
            <div className="p-3 bg-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Your AI agent is being set up automatically. This usually takes 2-5 minutes.
              </p>
            </div>
          )}

          {automationRun.error_message && (
            <div className="p-3 bg-red-100 rounded-lg border border-red-200">
              <p className="text-sm text-red-900">
                <strong>Error:</strong> {automationRun.error_message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step-by-Step Log */}
      <Card>
        <CardHeader>
          <CardTitle>Installation Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {automationRun.step_logs?.map((log, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all",
                  log.status === 'completed' ? "bg-green-50 border-green-200" :
                  log.status === 'processing' ? "bg-blue-50 border-blue-200" :
                  log.status === 'failed' ? "bg-red-50 border-red-200" :
                  "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(log.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      STEP {log.step}
                    </Badge>
                    <span className="font-semibold text-slate-900">{log.title}</span>
                  </div>
                  <p className="text-sm text-slate-600">{log.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Widget Code (if completed) */}
      {automationRun.status === 'completed' && automationRun.widget_code && (
        <Card>
          <CardHeader>
            <CardTitle>Website Widget Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-slate-100 font-mono">
                {automationRun.widget_code}
              </pre>
            </div>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => {
                navigator.clipboard.writeText(automationRun.widget_code);
                alert('Widget code copied to clipboard!');
              }}
            >
              Copy Code
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}