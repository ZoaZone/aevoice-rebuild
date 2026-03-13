import { useEffect, useState } from 'react';
import { trackEvent } from '@/components/telemetry/telemetry';
import { startHotword, stopHotword } from '@/components/voice/hotword';
import desktopBridge from '@/components/desktop';

export default function AgenticView({ config }){
  const [screenContext, setScreenContext] = useState(null);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  
  useEffect(() => {
    // Start hotword if enabled in config
    if (config?.enableHotword) {
      startHotword();
      if (window.SREE_DEBUG) {
        console.log('[AgenticView] Hotword started');
      }
    }
    
    trackEvent('agenticModeEnabled');
    
    // Cleanup
    return () => { 
      if (config?.enableHotword) {
        stopHotword(); 
      }
    };
  }, [config?.enableHotword]);
  
  useEffect(() => {
    // Poll screen context if enabled
    if (config?.enableScreenContext) {
      if (window.SREE_DEBUG) {
        console.log('[AgenticView] Starting screen context polling');
      }
      
      const cleanup = desktopBridge.pollScreenContext((ctx) => {
        setScreenContext(ctx);
        if (window.SREE_DEBUG) {
          console.log('[AgenticView] Screen context updated:', ctx);
        }
      }, 3000);
      
      return cleanup;
    }
  }, [config?.enableScreenContext]);
  
  useEffect(() => {
    // Enable overlay if configured
    if (config?.enableOverlay) {
      setOverlayEnabled(true);
      desktopBridge.send('overlay:show');
      if (window.SREE_DEBUG) {
        console.log('[AgenticView] Overlay enabled');
      }
      
      return () => {
        setOverlayEnabled(false);
        desktopBridge.send('overlay:hide');
      };
    }
  }, [config?.enableOverlay]);
  
  return (
    <div className="text-sm text-slate-600 p-3 space-y-3">
      <div className="font-medium text-slate-800">Agentic Sree is active</div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={config?.enableHotword ? 'text-green-600' : 'text-slate-400'}>
            {config?.enableHotword ? '✓' : '✗'}
          </span>
          <span>Hotword detection</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={config?.enableOverlay ? 'text-green-600' : 'text-slate-400'}>
            {config?.enableOverlay ? '✓' : '✗'}
          </span>
          <span>Screen overlay</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={config?.enableScreenContext ? 'text-green-600' : 'text-slate-400'}>
            {config?.enableScreenContext ? '✓' : '✗'}
          </span>
          <span>Screen context awareness</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={config?.enableKB ? 'text-green-600' : 'text-slate-400'}>
            {config?.enableKB ? '✓' : '✗'}
          </span>
          <span>Knowledge base</span>
        </div>
      </div>
      
      {screenContext && (
        <div className="mt-3 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs">
          <div className="font-medium text-indigo-800 mb-1">Current Context:</div>
          <div className="text-indigo-600">App: {screenContext.currentApp || 'Unknown'}</div>
          <div className="text-indigo-600">Screen: {screenContext.currentScreen || 'Unknown'}</div>
          {screenContext.suggestion && (
            <div className="text-indigo-500 mt-1 italic">💡 {screenContext.suggestion}</div>
          )}
        </div>
      )}
      
      <div className="text-xs text-slate-500 mt-2">
        Say "Come on Sree" to activate voice commands
      </div>
    </div>
  );
}