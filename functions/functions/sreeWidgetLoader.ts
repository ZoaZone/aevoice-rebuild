import { validateRequestHost } from "./utils/hostGating.ts";

Deno.serve((req) => {
  const requestId = crypto.randomUUID();
  console.log("[SreeWidgetLoader] Request", {
    requestId,
    url: req.url,
    method: req.method,
  });

  // Validate request origin
  const hostValidation = validateRequestHost(req);
  if (!hostValidation.allowed) {
    console.warn("[SreeWidgetLoader] Unauthorized host", {
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
    return new Response(null, { headers: corsHeaders });
  }

  const js = `(() => { try {
    const s = document.currentScript;
    const cfg = (window.aevoiceConfig || {});
    const agentId = cfg.agentId || s?.dataset?.agentId || s?.getAttribute('data-agent-id');
    const clientId = cfg.clientId || s?.dataset?.clientId || s?.getAttribute('data-client-id') || '';
    cfg.mode = cfg.mode || 'sree-agentic';
    cfg.assistantType = 'SreeWeb';
    cfg.miniMonitor = cfg.features?.miniMonitor ?? true;
    const HOST = (s?.dataset?.host) || new URL(s.src || window.location.href, window.location.href).origin;
    const PAGE_PATH = '/WidgetHost';
    const pos = (cfg.position || 'bottom-right');
    const btnColor = cfg.buttonColor || '#0e4166';
    const panelW = Number(cfg.panelWidth || 480);
    const panelH = Number(cfg.panelHeight || 650);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.zIndex = String(cfg.zIndex || 2147483647);
    const setPos = () => {
      const base = 24;
      if (pos.includes('bottom')) container.style.bottom = base + 'px'; else container.style.top = base + 'px';
      if (pos.includes('right')) container.style.right = base + 'px'; else container.style.left = base + 'px';
    };
    setPos();

    const button = document.createElement('button');
    button.style.minWidth = '52px';
    button.style.height = '52px';
    button.style.borderRadius = cfg.buttonShape === 'circle' ? '50%' : '999px';
    button.style.border = 'none';
    button.style.padding = cfg.buttonShape === 'circle' ? '0' : '0 14px';
    button.style.background = btnColor; button.style.color = '#fff';
    button.style.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    button.textContent = cfg.buttonShape === 'circle' ? '' : (cfg.buttonText || 'Chat');
    container.appendChild(button);

    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.width = panelW + 'px'; panel.style.height = panelH + 'px';
    panel.style.maxWidth = '95vw'; panel.style.maxHeight = '85vh';
    panel.style.borderRadius = '16px'; panel.style.overflow = 'hidden';
    panel.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)'; panel.style.background = '#fff';
    panel.style.display = 'none';
    if (pos.includes('bottom')) panel.style.bottom = '88px'; else panel.style.top = '88px';
    if (pos.includes('right')) panel.style.right = '24px'; else panel.style.left = '24px';

    const iframe = document.createElement('iframe');
    const cfgStr = btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
    const url = HOST + PAGE_PATH + '?agent_id=' + encodeURIComponent(agentId) + '&client_id=' + encodeURIComponent(clientId) + '&config=' + encodeURIComponent(cfgStr);
    iframe.src = url; iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = '0';
    iframe.allow = 'microphone; clipboard-read; clipboard-write;';
    panel.appendChild(iframe);

    document.body.appendChild(panel); document.body.appendChild(container);

    let open = false; const toggle = () => { open = !open; panel.style.display = open ? 'block' : 'none'; };
    button.addEventListener('click', toggle);

    if (cfg.proactiveGreeting) setTimeout(() => { if (!open) toggle(); }, 3000);
  } catch (e) { 
    // SECURITY FIX: Structured error logging instead of silent failure
    // This prevents widget failures from being hidden and aids debugging
    console.error('[sreeWidget] Widget initialization failed', { 
      error: e?.message || String(e),
      stack: e?.stack,
      widgetId: cfg?.widgetId 
    }); 
  } })();`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Vary": "Origin",
      "Cache-Control": "public, max-age=600",
    },
  });
});
