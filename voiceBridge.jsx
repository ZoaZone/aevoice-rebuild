let dataListeners = [];
let errorListeners = [];
let recognition = null;
let autoRestart = false;
let backoffMs = 1000;

export function onVoiceData(cb) {
  dataListeners.push(cb);
  return () => { dataListeners = dataListeners.filter(fn => fn !== cb); };
}
export function onVoiceError(cb) {
  errorListeners.push(cb);
  return () => { errorListeners = errorListeners.filter(fn => fn !== cb); };
}

export async function startMic() {
  try {
    if (typeof window === "undefined") return false;
    autoRestart = true;
    backoffMs = 1000;
    // Desktop bridges
    if (window.electron?.startMic) {
      await window.electron.startMic();
      window.electron.onVoiceData?.((chunk) => dataListeners.forEach(fn => fn(chunk)));
      window.electron.onVoiceError?.((err) => errorListeners.forEach(fn => fn(err)));
      return true;
    }
    if (window.__TAURI__?.invoke) {
      try { await window.__TAURI__.invoke("start_mic"); } catch(_) {}
      return true;
    }
    // Browser fallback: Web Speech API
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join("");
      const isFinal = !!event.results[event.results.length - 1]?.isFinal;
      dataListeners.forEach(fn => fn({ transcript, isFinal }));
    };
    recognition.onerror = (e) => { errorListeners.forEach(fn => fn(e)); };
    recognition.onend = () => {
      if (autoRestart) {
        setTimeout(() => { if (autoRestart) startMic(); }, backoffMs);
        backoffMs = Math.min(backoffMs * 2, 10000);
      }
    };
    recognition.start();
    return true;
  } catch (err) {
    errorListeners.forEach(fn => fn(err));
    return false;
  }
}

export async function stopMic() {
  try {
    if (typeof window === "undefined") return false;
    autoRestart = false;
    backoffMs = 1000;
    if (window.electron?.stopMic) {
      await window.electron.stopMic();
      return true;
    }
    if (window.__TAURI__?.invoke) {
      try { await window.__TAURI__.invoke("stop_mic"); } catch(_) {}
      return true;
    }
    if (recognition) {
      try { recognition.stop(); } catch(_) {}
      recognition = null;
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}