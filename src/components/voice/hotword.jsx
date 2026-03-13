import desktopBridge from "@/components/desktop";
import { trackEvent } from "@/components/telemetry/telemetry";
import eventBus from "@/components/sree/engine/eventBus";

let mediaStream = null;
let audioCtx = null;
let analyser = null;
let rafId = null;
let running = false;
let subscribers = new Set();
let falsePos = 0;
let cooldown = false;
let lastDetected = 0;
let pausedForCpu = false;
let wakePhrase = 'come on sree'; // updated from "hey sree"
let sensitivity = 0.12;
let speechRecog = null;

function approxCpuBusy(){
  // crude event loop lag measure
  const start = performance.now();
  return new Promise((resolve)=>{
    setTimeout(()=>{
      const lag = performance.now() - start - 100;
      // map lag to 0..1; >200ms lag ~ 1.0
      const score = Math.min(1, Math.max(0, lag / 200));
      resolve(score);
    }, 100);
  });
}

function notify(){ subscribers.forEach(cb => { try { cb(); } catch(_){} }); }

export function onHotwordDetected(cb){ subscribers.add(cb); return () => subscribers.delete(cb); }

async function detectEnergyThreshold(){
  if (!analyser) return;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i=0;i<data.length;i++){ const v = (data[i]-128)/128; sum += v*v; }
  const rms = Math.sqrt(sum / data.length);
  // dynamic threshold with cooldown
  const threshold = sensitivity; // configurable
  const now = Date.now();
  
  if (window.SREE_DEBUG && rms > 0.05) {
    console.log('[hotword] Energy level:', rms.toFixed(4), 'threshold:', threshold, 'cooldown:', cooldown);
  }
  
  if (!cooldown && rms > threshold && (now - lastDetected) > 1500){
    lastDetected = now;
    
    if (window.SREE_DEBUG) {
      console.log('[hotword] ✓ Hotword detected! Starting mic...', { rms: rms.toFixed(4), threshold });
    }
    
    // Ensure desktopBridge and startMic are available
    if (typeof desktopBridge?.startMic === 'function') {
      try {
        const result = await desktopBridge.startMic();
        if (!result?.ok && window.SREE_DEBUG) {
          console.warn('[hotword] Failed to start mic:', result?.error);
        }
      } catch (error) {
        if (window.SREE_DEBUG) {
          console.error('[hotword] Error starting mic:', error);
        }
      }
    } else {
      if (window.SREE_DEBUG) {
        console.warn('[hotword] desktopBridge.startMic not available');
      }
    }
    
    // Trigger voice start on wake
    try { eventBus.emit('voice:start'); } catch {}
    trackEvent('hotwordDetected');
    notify();
    // simple false positive tracking: if no subsequent voice data within 2s, count
    setTimeout(()=>{ 
      falsePos++; 
      if (falsePos > 5) {
        cooldown = true;
        if (window.SREE_DEBUG) {
          console.warn('[hotword] Too many false positives, entering cooldown');
        }
      }
    }, 2000);
  }
}

async function loop(){
  if (!running) return;
  if (pausedForCpu){ rafId = requestAnimationFrame(loop); return; }
  analyser && detectEnergyThreshold();
  rafId = requestAnimationFrame(loop);
}

export function configureHotword(cfg = {}){
  if (typeof cfg.phrase === 'string' && cfg.phrase.trim()) wakePhrase = cfg.phrase.toLowerCase();
  if (typeof cfg.sensitivity === 'number') sensitivity = Math.max(0.05, Math.min(0.3, cfg.sensitivity));
}

export async function startHotword(){
  if (running) {
    if (window.SREE_DEBUG) {
      console.log('[hotword] Already running, skipping start');
    }
    return true;
  }
  
  if (window.SREE_DEBUG) {
    console.log('[hotword] Starting hotword detection...');
  }
  
  // CPU guard
  const cpuScore = await approxCpuBusy();
  if (window.SREE_DEBUG) {
    console.log('[hotword] CPU score:', cpuScore.toFixed(2));
  }
  
  if (cpuScore > 0.8){ 
    pausedForCpu = true; 
    setTimeout(()=>{ pausedForCpu = false; }, 5000); 
    if (window.SREE_DEBUG) {
      console.warn('[hotword] High CPU detected, pausing for 5s');
    }
  }
  
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const src = audioCtx.createMediaStreamSource(mediaStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    running = true; cooldown = false; falsePos = 0;

    // Optional phrase-level wake using Web SpeechRecognition when available
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        speechRecog = new SR();
        speechRecog.continuous = true;
        speechRecog.interimResults = false;
        speechRecog.lang = 'en-US';
        speechRecog.onresult = (ev) => {
          const res = ev.results[ev.results.length - 1][0]?.transcript || '';
          const text = String(res).toLowerCase();
          if (text.includes(wakePhrase)) {
            if (window.SREE_DEBUG) console.log('[hotword] Phrase wake detected:', wakePhrase);
            try { eventBus.emit('voice:start'); } catch {}
            trackEvent('hotwordPhrase');
          }
        };
        speechRecog.onerror = () => {};
        let hotwordActive = true;
        speechRecog.onend = () => {
          // Restart only if still running and not currently in a voice session
          if (running && hotwordActive) {
            setTimeout(() => { try { speechRecog.start(); } catch {} }, 500);
          }
        };
        // Pause hotword SR while VoiceChatView is actively listening
        eventBus.on('runtime:status', (status) => {
          if (status === 'listening' || status === 'processing') {
            hotwordActive = false;
            try { speechRecog.abort(); } catch {}
          } else if (status === 'idle' || status === 'speaking') {
            hotwordActive = true;
            setTimeout(() => { try { if (running) speechRecog.start(); } catch {} }, 600);
          }
        });
        speechRecog.start();
      }
    } catch {}
    
    if (window.SREE_DEBUG) {
      console.log('[hotword] ✓ Successfully initialized', {
        audioContextState: audioCtx.state,
        mediaStreamActive: mediaStream.active,
        analyserFFTSize: analyser.fftSize
      });
    }
    
    loop();
    return true;
  } catch (e) {
    if (window.SREE_DEBUG) {
      console.error('[hotword] ✗ Failed to start:', e.message);
    }
    return false;
  }
}

export function stopHotword(){
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  try { mediaStream?.getTracks()?.forEach(t=>t.stop()); } catch {}
  try { audioCtx?.close?.(); } catch {}
  try { speechRecog?.stop?.(); } catch {}
  mediaStream = null; audioCtx = null; analyser = null; cooldown = false; pausedForCpu = false; speechRecog = null;
}

/**
 * Debug state dump for troubleshooting hotword detection
 * @returns {Object} Current hotword detection state
 */
export function debugState() {
  const state = {
    running,
    pausedForCpu,
    cooldown,
    falsePos,
    lastDetected,
    timeSinceLastDetection: Date.now() - lastDetected,
    subscribersCount: subscribers.size,
    audioContextState: audioCtx?.state || 'not-initialized',
    mediaStreamActive: mediaStream?.active ?? null,
    analyserInitialized: analyser !== null,
    animationFrameRunning: rafId !== null
  };
  
  if (window.SREE_DEBUG) {
    console.log('[hotword] Debug State:', state);
  }
  
  return state;
}