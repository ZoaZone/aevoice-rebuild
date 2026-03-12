import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Play, Camera, Sparkles } from "lucide-react";

export default function AgenticMiniMonitor(){
  const [active, setActive] = useState({ app: 'Unknown', window: 'Unknown' });
  const [suggestions, setSuggestions] = useState([
    'Summarize current page',
    'Draft reply email',
    'Create meeting notes'
  ]);
  const [captures, setCaptures] = useState([]);

  useEffect(() => {
    const onCtx = (e) => {
      const ctx = e.detail || {};
      setActive({ app: ctx.currentApp || 'Unknown', window: ctx.currentScreen || 'Unknown' });
      if (ctx.suggestion) setSuggestions((s) => [ctx.suggestion, ...s].slice(0,5));
    };
    window.addEventListener('sree:screenContext', onCtx);
    return () => window.removeEventListener('sree:screenContext', onCtx);
  }, []);

  const addCapture = () => {
    // For now, simulate capture
    const url = `https://images.unsplash.com/photo-1505238680356-667803448bb6?w=400&auto=format&fit=crop&q=60`; 
    setCaptures((c)=>[url, ...c].slice(0,6));
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/30 border-l border-slate-800">
      <Card className="rounded-none bg-transparent border-0">
        <CardHeader className="py-3 px-3">
          <CardTitle className="text-xs text-slate-200 flex items-center gap-2">
            <Monitor className="w-4 h-4"/> Mini Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="text-[11px] text-slate-300">
            Active: <span className="font-medium">{active.app}</span> • <span>{active.window}</span>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={()=>window.dispatchEvent(new CustomEvent('sree:status', { detail: 'listening' }))}>
              <Play className="w-3 h-3 mr-1"/> Listen
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={()=>window.dispatchEvent(new CustomEvent('sree:status', { detail: 'thinking' }))}>
              <Sparkles className="w-3 h-3 mr-1"/> Think
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={()=>window.dispatchEvent(new CustomEvent('sree:status', { detail: 'speaking' }))}>
              Speaking
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={()=>window.dispatchEvent(new CustomEvent('sree:status', { detail: 'idle' }))}>
              Idle
            </Button>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="text-[11px] text-slate-400">Workflow Suggestions</div>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={()=>setSuggestions((s)=>['Generate task list', ...s].slice(0,5))}>Add</Button>
          </div>
          <ul className="space-y-1">
            {suggestions.map((s,i)=> (
              <li key={i} className="text-[11px] text-slate-200 bg-slate-800/50 border border-slate-700 rounded px-2 py-1">
                {s}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between mt-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1"><Camera className="w-3 h-3"/> Recent Captures</div>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={addCapture}>Capture</Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {captures.map((src, i)=> (
              <img key={i} src={src} className="rounded border border-slate-700 object-cover w-full h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}