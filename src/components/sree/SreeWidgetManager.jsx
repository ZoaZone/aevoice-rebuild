import { useState, useEffect } from 'react';
import SreeUnifiedWidget from './SreeUnifiedWidget';
import SreeMiniMonitor from './SreeMiniMonitor';
import SreeDemoMode from './SreeDemoMode';
import SreeFloatingWidget from './SreeFloatingWidget';
import desktopBridge from '@/components/desktop';

/**
 * SreeWidgetManager Component
 * 
 * Manages the 4 widget states for Sree:
 * 1. EXPANDED - Full floating widget with chat/voice
 * 2. MINIMIZED - Small icon with TEXT CHAT button
 * 3. MINI_MONITOR - Desktop preview mode
 * 4. DEMO_MODE - Guided demo/kiosk mode
 * 
 * This component determines which widget to display based on context and configuration
 */

export const WIDGET_STATES = {
  EXPANDED: 'expanded',
  MINIMIZED: 'minimized',
  MINI_MONITOR: 'mini_monitor',
  DEMO_MODE: 'demo_mode'
};

export default function SreeWidgetManager({
  agentId,
  clientId,
  config = {},
  initialState = null
}) {
  const [widgetState, setWidgetState] = useState(initialState || WIDGET_STATES.EXPANDED);
  const [showWidget, setShowWidget] = useState(true);
  const [desktopMode, setDesktopMode] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Detect desktop app context using unified API
  useEffect(() => {
    const isDesktop = !!(desktopBridge && typeof desktopBridge.isDesktop === 'function' && desktopBridge.isDesktop());
    setDesktopMode(isDesktop);
  }, []);

  // Auto-detect initial state based on context and config
  useEffect(() => {
    if (initialState) return; // User specified state, don't override

    // Check for demo mode flag in config
    if (config.demoMode || config.kioskMode) {
      setWidgetState(WIDGET_STATES.DEMO_MODE);
      return;
    }

    // Check for mini monitor mode (Aevathon/dashboard context)
    if (
      config.miniMonitorMode ||
      (typeof window !== 'undefined' && (window.__SREE_FLAGS__?.enableSreeDemo || window.__SREE_FLAGS__?.enableMiniMonitor))
    ) {
      setWidgetState(WIDGET_STATES.MINI_MONITOR);
      return;
    }

    // Desktop app defaults to expanded floating widget
    if (desktopMode) {
      setWidgetState(WIDGET_STATES.EXPANDED);
      return;
    }

    // Default: Start minimized, user can expand
    setWidgetState(config.startMinimized ? WIDGET_STATES.MINIMIZED : WIDGET_STATES.EXPANDED);
  }, [desktopMode, initialState, config]);

  // Auto-switch to MINI_MONITOR when desktop context is active (if not user-interacted)
  useEffect(() => {
    if (!desktopMode || hasUserInteracted || initialState) return;
    
    let mounted = true;
    
    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      if (!mounted) return;
      
      // Poll for active desktop context every 3 seconds (consistent with screen context polling)
      const cleanup = desktopBridge.pollScreenContext((context) => {
        if (!mounted) return;
        if (context && context.currentApp !== 'Web Browser') {
          // Active desktop context detected - switch to mini monitor if not already expanded
          if (widgetState === WIDGET_STATES.MINIMIZED) {
            setWidgetState(WIDGET_STATES.MINI_MONITOR);
          }
        }
      }, 3000); // 3 seconds - consistent with SCREEN_CONTEXT_UPDATE_INTERVAL
      
      // Return cleanup that also clears the timeout
      return () => {
        mounted = false;
        cleanup();
      };
    }, 100); // 100ms delay to ensure mount
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [desktopMode, hasUserInteracted, widgetState, initialState]);

  // Handle user interaction - switch to EXPANDED
  const handleUserInteraction = () => {
    setHasUserInteracted(true);
    if (widgetState !== WIDGET_STATES.EXPANDED && widgetState !== WIDGET_STATES.DEMO_MODE) {
      setWidgetState(WIDGET_STATES.EXPANDED);
    }
  };

  // Close widget entirely
  const closeWidget = () => {
    setShowWidget(false);
  };

  if (!showWidget) return null;

  // Render appropriate widget based on state
  switch (widgetState) {
    case WIDGET_STATES.DEMO_MODE:
      return (
        <SreeDemoMode
          kioskMode={config.kioskMode}
          autoPlay={config.autoPlay}
        />
      );

    case WIDGET_STATES.MINI_MONITOR:
      return (
        <div onClick={handleUserInteraction}>
          <SreeMiniMonitor
            enabled={true}
            mode={desktopMode ? 'monitor' : 'demo'}
          />
        </div>
      );

    case WIDGET_STATES.MINIMIZED:
      return (
        <div onClick={handleUserInteraction}>
          <SreeFloatingWidget
            agentId={agentId}
            agentConfig={config}
            onClose={closeWidget}
          />
        </div>
      );

    case WIDGET_STATES.EXPANDED:
      return (
        <div onClick={handleUserInteraction}>
          <SreeUnifiedWidget
            agentId={agentId}
            clientId={clientId}
            config={{ ...config, desktopMode }}
          />
        </div>
      );

    default:
      return null;
  }
}