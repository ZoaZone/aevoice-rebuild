import { useEffect, useState, useCallback, useRef } from 'react';
import * as screenCtx from '@/components/desktop/screenContext';
import desktopBridge from '@/components/desktop';
import { trackEvent } from '@/components/telemetry/telemetry';
import { runLLM } from '@/components/llm/llmRouter';
import eventBus from '@/components/sree/engine/eventBus';

// Overlay auto-hide duration
const OVERLAY_AUTO_HIDE_DURATION = 5000;

export default function Overlay(){
  const [visible, setVisible] = useState(false);
  const [ctx, setCtx] = useState(null);
  const ctxRef = useRef(null);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Get AI suggestion based on screen context
  // Using useCallback to ensure stable reference
  const getSuggestion = useCallback(async (context) => {
    if (!context) return;
    
    setLoading(true);
    try {
      if (window.SREE_DEBUG) {
        console.log('[Overlay] Getting AI suggestion for context:', context);
      }
      
      const prompt = `You are Sree, an AI desktop assistant. Based on this screen context, provide a brief helpful suggestion (1 short sentence):
          
App: ${context.currentApp || 'Unknown'}
Screen: ${context.currentScreen || 'Unknown'}
${context.suggestion ? `Context: ${context.suggestion}` : ''}

Provide ONE actionable tip or next step.`;
      
      const res = await runLLM(prompt, {});
      
      if (res?.output) {
        setSuggestion(res.output);
        if (window.SREE_DEBUG) {
          console.log('[Overlay] AI suggestion:', res.output);
        }
      }
    } catch (error) {
      if (window.SREE_DEBUG) {
        console.error('[Overlay] Failed to get AI suggestion:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - setSuggestion and setLoading are stable
  
  useEffect(()=>{
    let hideTimer = null;
    const show = async () => {
      setVisible(true);
      trackEvent('overlayShown');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(()=>{ 
        setVisible(false); 
        trackEvent('overlayHidden'); 
        setSuggestion(''); 
      }, OVERLAY_AUTO_HIDE_DURATION);
      
      // Get AI suggestion based on current screen context
      if (ctxRef.current) {
        getSuggestion(ctxRef.current);
      }
    };
    const unsub1 = desktopBridge.on('overlay:show', show);
    const unsub2 = desktopBridge.on('overlay:hide', ()=>{ 
      setVisible(false); 
      trackEvent('overlayHidden'); 
      setSuggestion(''); 
    });
    const unsub3 = screenCtx.pollScreenContext((c)=> { ctxRef.current = c; setCtx(c); }, 2000);
    const onKey = (e)=>{ if ((e.ctrlKey || e.metaKey) && e.code === 'Space') { e.preventDefault(); show(); try { eventBus.emit('voice:start'); } catch {} } };
    window.addEventListener('keydown', onKey);
    return ()=>{ unsub1?.(); unsub2?.(); unsub3?.(); window.removeEventListener('keydown', onKey); clearTimeout(hideTimer); };
  },[getSuggestion]); // use stable callback, ctx via ref

  if (!visible) return null;
  return (
    <div style={{ pointerEvents:'none' }} className="fixed inset-0 z-[9999]">
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/20 text-white backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 shadow-lg max-w-md">
        <div className="text-xs opacity-80">{ctx?.currentApp || 'App'}</div>
        <div className="text-sm font-semibold">{ctx?.currentScreen || '/'} • Listening…</div>
        <div className="mt-1 h-1.5 bg-white/20 rounded overflow-hidden">
          <div className="h-full bg-cyan-400 animate-pulse" style={{ width: '60%' }} />
        </div>
        {loading && (
          <div className="mt-2 text-xs opacity-70 italic">Getting AI suggestion...</div>
        )}
        {suggestion && !loading && (
          <div className="mt-2 text-xs bg-white/10 px-2 py-1 rounded border border-white/20">
            💡 {suggestion}
          </div>
        )}
      </div>
    </div>
  );
}