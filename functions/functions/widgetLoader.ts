import { validateRequestHost } from "./utils/hostGating.ts";

Deno.serve((req) => {
  // Public JS loader for the AEVOICE widget (self-hosted)
  const requestId = crypto.randomUUID();
  console.log("[WidgetLoader] Request received:", {
    request_id: requestId,
    method: req.method,
    url: req.url,
  });

  // Validate request origin
  const hostValidation = validateRequestHost(req);
  if (!hostValidation.allowed) {
    console.warn("[WidgetLoader] Unauthorized host", {
      host: hostValidation.host,
      reason: hostValidation.reason,
    });
    return new Response("Forbidden", { status: 403 });
  }

  // Use full origin (with scheme) for CORS, not bare hostname
  // Add Vary: Origin to prevent caches from mixing responses across origins
  // For widget loaders, we need to support requests without Origin (direct access)
  // but use validated origin when present
  const allowedOrigin = hostValidation.origin || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Vary": "Origin",
  };

  if (req.method === "OPTIONS") {
    console.log("[WidgetLoader] Handling OPTIONS request for CORS", {
      request_id: requestId,
    });
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[WidgetLoader] Generating widget JavaScript code", {
    request_id: requestId,
  });

  const js = `(() => { try {
    console.log('AEVOICE Widget: Initialization started');
    const s = document.currentScript;
    const agentId = s?.dataset?.agentId || s?.getAttribute('data-agent-id');
    const clientId = s?.dataset?.clientId || s?.getAttribute('data-client-id') || '';
    const cfg = (window.aevoiceConfig || {});
    
    // Detect desktop app context (Electron/Tauri)
    const isDesktopApp = !!(window.__TAURI__ || window.electron || (window.process && window.process.type === 'renderer'));
    
    // Detect widget mode from config
    const widgetMode = cfg.widgetMode || (cfg.demoMode ? 'demo' : cfg.miniMonitorMode ? 'monitor' : 'floating');
    
    // Sree defaults
    cfg.greetingMessage = cfg.greetingMessage || "Hi! I'm Sree. How can I help you today? 👋";
    cfg.avatarUrl = cfg.avatarUrl || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg";
    cfg.buttonText = cfg.buttonText || 'Sree';
    cfg.assistantType = isDesktopApp ? 'SreeDesktop' : 'SreeWeb';
    cfg.widgetMode = widgetMode;
    
    console.log('AEVOICE Widget: Configuration loaded', { agentId, clientId, config: cfg, isDesktopApp, widgetMode });
    if (!agentId) { 
      console.warn('AEVOICE: data-agent-id missing'); 
      return; 
    }
    
    // Referrer validation (logged for monitoring - enforcement can be added in future if needed)
    // Note: This logs the referrer but does not block unauthorized domains
    const referrer = document.referrer || window.location.href;
    const referrerHostname = new URL(referrer, window.location.href).hostname;
    console.log('AEVOICE Widget: Referrer check', { referrer, hostname: referrerHostname });

    const HOST = (s?.dataset?.host) || new URL(s.src || window.location.href, window.location.href).origin;
    const PAGE_PATH = '/WidgetHost';
    const pos = (cfg.position || 'bottom-right');
    const btnColor = cfg.buttonColor || '#0e4166';
    const panelW = Number(cfg.panelWidth || 380);
    const panelH = Number(cfg.panelHeight || 560);
    const offsetX = Number(cfg.offsetX || 0);
    const offsetY = Number(cfg.offsetY || 0);
    const z = String(cfg.zIndex || 2147483647);
    const openOnLoad = !!cfg.openOnLoad;
    const buttonShape = cfg.buttonShape || 'pill';

    // Button container
    const container = document.createElement('div');
    container.id = 'aevoice-widget-button';
    container.className = 'sree-widget';
    container.style.position = 'fixed';
    container.style.zIndex = z;
    const setPos = () => {
      const base = 24;
      const y = base + offsetY;
      const x = base + offsetX;
      if (pos.includes('bottom')) container.style.bottom = y + 'px'; else container.style.top = y + 'px';
      if (pos.includes('right')) container.style.right = x + 'px'; else container.style.left = x + 'px';
    };
    setPos();

    const button = document.createElement('button');
    button.style.minWidth = '52px';
    button.style.height = '52px';
    button.style.padding = '0 14px';
    button.style.borderRadius = '999px';
    button.style.border = 'none';
    button.style.background = btnColor;
    button.style.color = '#fff';
    button.style.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)';
    button.textContent = (cfg.buttonText || 'Chat');
    if (buttonShape === 'circle') { button.style.minWidth = '52px'; button.style.width = '52px'; button.style.borderRadius = '50%'; button.textContent = ''; }
    container.appendChild(button);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'aevoice-widget-panel';
    panel.className = 'sree-widget';
    panel.style.position = 'fixed';
    panel.style.width = panelW + 'px';
    panel.style.height = panelH + 'px';
    panel.style.maxWidth = '95vw';
    panel.style.maxHeight = '85vh';
    panel.style.borderRadius = '16px';
    panel.style.overflow = 'hidden';
    panel.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
    panel.style.background = '#fff';
    panel.style.display = 'none';
    panel.style.zIndex = z;
    if (pos.includes('bottom')) panel.style.bottom = (88 + offsetY) + 'px'; else panel.style.top = (88 + offsetY) + 'px';
    if (pos.includes('right')) panel.style.right = (24 + offsetX) + 'px'; else panel.style.left = (24 + offsetX) + 'px';

    const iframe = document.createElement('iframe');
    const cfgStr = btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
    const url = HOST + PAGE_PATH +
      '?agent_id=' + encodeURIComponent(agentId) +
      '&client_id=' + encodeURIComponent(clientId) +
      '&config=' + encodeURIComponent(cfgStr);
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.allow = 'microphone; clipboard-read; clipboard-write;';
    panel.appendChild(iframe);

    const attachSel = cfg.attachToSelector;
    const parent = attachSel ? document.querySelector(attachSel) : null;
    if (parent) {
      parent.style.position = parent.style.position || 'relative';
      container.style.position = 'absolute';
      panel.style.position = 'absolute';
      parent.appendChild(panel);
      parent.appendChild(container);
    } else {
      document.body.appendChild(panel);
      document.body.appendChild(container);
    }

    let open = false;
    const toggle = () => {
      open = !open;
      panel.style.display = open ? 'block' : 'none';
    };
    button.addEventListener('click', toggle);
    if (openOnLoad) { toggle(); }

    if (cfg.proactiveGreeting && Number(cfg.showAfterSeconds) >= 0) {
      setTimeout(() => { if (!open) toggle(); }, (cfg.showAfterSeconds || 5) * 1000);
    }

    console.log('AEVOICE Widget: Successfully initialized', { agentId, clientId });
  } catch (e) { 
    console.error('AEVOICE widget failed', e); 
  } })();`;

  console.log("[WidgetLoader] Widget JavaScript generated successfully", {
    request_id: requestId,
  });

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=600",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Vary": "Origin",
    },
  });
});
