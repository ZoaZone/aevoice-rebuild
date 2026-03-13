import { useEffect, useRef } from 'react';
import desktopBridge from '@/components/desktop';
import * as screenCtx from '@/components/desktop/screenContext';
import { onHotwordDetected } from '@/components/voice/hotword';
import { trackEvent } from '@/components/telemetry/telemetry';

export default function Watchdog(){
  const lastScreen = useRef(Date.now());
  const lastVoice = useRef(Date.now());
  const lastHotword = useRef(Date.now());

  useEffect(()=>{
    const unsubScreen = screenCtx.pollScreenContext(()=>{ lastScreen.current = Date.now(); }, 3000);
    const unsubVoice = desktopBridge.on('voice:event', ()=>{ lastVoice.current = Date.now(); });
    const unsubHot = onHotwordDetected(()=>{ lastHotword.current = Date.now(); });

    const id = setInterval(()=>{
      const now = Date.now();
      if (now - lastScreen.current > 10000 || now - lastVoice.current > 10000 || now - lastHotword.current > 30000){
        trackEvent('autoRecover', {
          noScreenMs: now - lastScreen.current,
          noVoiceMs: now - lastVoice.current,
          noHotwordMs: now - lastHotword.current
        });
        desktopBridge.recoverAll?.();
        lastScreen.current = now; lastVoice.current = now; lastHotword.current = now;
      }
    }, 5000);

    return ()=>{ unsubScreen?.(); unsubVoice?.(); unsubHot?.(); clearInterval(id); };
  },[]);

  return null;
}