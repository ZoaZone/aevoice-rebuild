import { isDesktopApp } from "@/components/utils/desktopContext";

export async function captureScreen(mode = 'auto') {
  try {
    if (typeof window === "undefined") return null;
    if (isDesktopApp()) {
      if (window.electron?.captureScreen) return await window.electron.captureScreen();
      if (window.__TAURI__?.invoke) return await window.__TAURI__.invoke("capture_screen");
    }
    // Browser fallback using getDisplayMedia snapshot -> dataURL
    if (navigator.mediaDevices?.getDisplayMedia) {
      // Only proceed when explicitly initiated by a user action (button click)
      if (!window.__SREE_USER_INITIATED_CAPTURE__) return null;
      window.__SREE_USER_INITIATED_CAPTURE__ = false;
      const videoOpts = mode === 'tab' ? { preferCurrentTab: true } : (mode === 'window' ? {} : {});
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: videoOpts, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      try { await video.play(); } catch (_) {}
      await new Promise((resolve) => {
        if (video.readyState >= 2) return resolve();
        const done = () => { video.onloadeddata = null; video.onloadedmetadata = null; resolve(); };
        video.onloadeddata = done; video.onloadedmetadata = done;
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach(t => t.stop());
      return canvas.toDataURL("image/png");
    }
    return null;
  } catch (_) {
    return null;
  }
}