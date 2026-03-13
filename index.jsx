import { isDesktopApp } from "@/components/utils/desktopContext";
import * as screenCtx from "./screenContext";
import * as screenCap from "./screenCapture";
import * as voice from "./voiceBridge";
import * as notify from "./notifications";
import * as tray from "./systemTray";
import { trackEvent } from "@/components/telemetry/telemetry";

export async function safeCall(fn, label = "") {
  try {
    return await fn();
  } catch (err) {
    console.groupCollapsed(`[Desktop Error] ${label}`);
    console.error(err);
    console.groupEnd();
    return null;
  }
}

const desktopBridge = {
  // Desktop detection
  isDesktopApp,
  isDesktop() {
    try {
      return isDesktopApp();
    } catch {
      return false;
    }
  },

  // Screen context
  async getScreenContext() {
    return safeCall(() => screenCtx.getScreenContext(), 
"getScreenContext");
  },

  pollScreenContext(callback, intervalMs = 3000) {
    console.groupCollapsed("[Desktop] pollScreenContext start");
    console.log({ intervalMs });
    console.groupEnd();
    return screenCtx.pollScreenContext(callback, intervalMs);
  },

  // Screen capture
  async captureScreen() {
    const data = await safeCall(() => screenCap.captureScreen(), 
"captureScreen");
    return data ? { ok: true, data } : { ok: false, error: "no_capture" };
  },

  // Microphone
  async startMic() {
    const ok = await safeCall(() => voice.startMic(), "startMic");
    return ok ? { ok: true } : { ok: false, error: "failed_to_start_mic" 
};
  },

  async stopMic() {
    const ok = await safeCall(() => voice.stopMic(), "stopMic");
    return ok ? { ok: true } : { ok: false, error: "failed_to_stop_mic" };
  },

  onVoiceData(cb) {
    const unsub = voice.onVoiceData((evt) => {
      try {
        this.send("voice:event", evt);
      } catch {}
      cb?.(evt);
    });
    return () => {
      try {
        unsub?.();
      } catch {}
    };
  },

  onVoiceError(cb) {
    return voice.onVoiceError(cb);
  },

  // Notifications
  async showNotification(title, body) {
    return safeCall(() => notify.showNotification(title, body), 
"showNotification");
  },

  // System tray
  async setTrayState(state) {
    const ok = await safeCall(() => tray.setTrayState(state), 
"setTrayState");
    return ok ? { ok: true } : { ok: false };
  },

  // Feedback sounds
  async playFeedbackSound(kind = "success") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return { ok: false };

      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      const cfg =
        {
          success: { f: 880, dur: 0.12 },
          error: { f: 220, dur: 0.25 },
          thinking: { f: 440, dur: 0.08 },
          listening: { f: 660, dur: 0.15 },
        }[kind] || { f: 520, dur: 0.1 };

      o.type = "sine";
      o.frequency.value = cfg.f;

      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 
cfg.dur);

      o.connect(g);
      g.connect(ctx.destination);

      o.start();
      o.stop(ctx.currentTime + cfg.dur + 0.02);

      setTimeout(() => ctx.close(), (cfg.dur + 0.1) * 1000);

      return { ok: true };
    } catch {
      return { ok: false };
    }
  },

  // Browser TTS fallback
  async speak(text, opts = {}) {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis)
        return { ok: false };

      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text || ""));

      if (opts.rate) u.rate = opts.rate;
      if (opts.pitch) u.pitch = opts.pitch;
      if (opts.volume) u.volume = opts.volume;
      if (opts.lang) u.lang = opts.lang;

      window.speechSynthesis.speak(u);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },

  // Update events
  onUpdateEvent(cb) {
    if (typeof window === "undefined") return () => {};
    const un =
      window.electron?.onUpdateEvent || window.__TAURI__?.onUpdateEvent;
    if (un) return un(cb);
    return () => {};
  },

  async checkForUpdates() {
    if (typeof window === "undefined") return { ok: false };
    try {
      if (window.electron?.checkForUpdates) {
        await window.electron.checkForUpdates();
        return { ok: true };
      }
      if (window.__TAURI__?.invoke) {
        await window.__TAURI__.invoke("check_update");
        return { ok: true };
      }
      return { ok: false };
    } catch {
      return { ok: false };
    }
  },

  // Windows
  async openMiniMonitorWindow() {
    try {
      if (window.electron?.openMiniMonitor) {
        await window.electron.openMiniMonitor();
        return { ok: true };
      }
      if (window.__TAURI__?.invoke) {
        await window.__TAURI__.invoke("open_mini_monitor");
        return { ok: true };
      }
    } catch {}
    return { ok: false };
  },

  async openOverlayWindow() {
    try {
      if (window.electron?.openOverlay) {
        await window.electron.openOverlay();
        return { ok: true };
      }
      if (window.__TAURI__?.invoke) {
        await window.__TAURI__.invoke("open_overlay");
        return { ok: true };
      }
    } catch {}
    return { ok: false };
  },

  // Recovery
  async recover() {
    await safeCall(() => voice.stopMic(), "recover.stopMic");
    try {
      screenCtx.resetScreenContext?.();
    } catch {}
    return { ok: true };
  },

  async recoverAll() {
    try {
      await voice.stopMic();
    } catch {}
    try {
      screenCtx.resetScreenContext?.();
    } catch {}
    try {
      this.send("overlay:hide");
    } catch {}
    try {
      this.send("windows:reset");
    } catch {}
    try {
      this.send("hotword:stop");
    } catch {}
    return { ok: true };
  },

  // Event bus
  _bus: new Map(),

  send(channel, payload) {
    const subs = this._bus.get(channel);
    if (subs) subs.forEach((cb) => cb(payload));
  },

  on(channel, cb) {
    if (!this._bus.has(channel)) this._bus.set(channel, new Set());
    const set = this._bus.get(channel);
    set.add(cb);
    return () => set.delete(cb);
  },
};

export default desktopBridge;

