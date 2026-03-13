/**
 * Sree Debug Utilities
 * 
 * Runtime validation and debugging helpers for Sree unified widget.
 * Access via: window.sreeDebug.mode(), window.sreeDebug.flags(), etc.
 */

import { loadFeatureFlags } from '@/components/config/featureFlags';
import desktopBridge from '@/desktop/desktopBridge';
import { debugState as hotwordDebugState } from '@/components/voice/hotword';

/**
 * Get current widget mode and configuration
 */
async function getWidgetMode() {
  try {
    const { base44 } = await import('@/api/base44Client');
    const res = await base44.functions.invoke('getAssistantMode', {});
    
    const info = {
      savedMode: res?.data?.mode || 'Not saved',
      timestamp: new Date().toISOString(),
      validModes: ['Sri', 'Sree', 'Text Chat', 'Voice Chat', 'Agentic Sree']
    };
    
    console.log('[sreeDebug.mode] Current mode configuration:', info);
    return info;
  } catch (error) {
    console.error('[sreeDebug.mode] Error:', error.message);
    return { error: error.message };
  }
}

/**
 * Get current feature flags
 */
async function getFlags() {
  try {
    const flags = await loadFeatureFlags();
    
    const info = {
      flags,
      source: {
        backend: 'Loaded from SreeSettings entity',
        localStorage: 'Query params and local overrides applied',
        windowFlags: window.__SREE_FLAGS__ || null
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('[sreeDebug.flags] Current feature flags:', info);
    return info;
  } catch (error) {
    console.error('[sreeDebug.flags] Error:', error.message);
    return { error: error.message };
  }
}

/**
 * Get widget state and health
 */
async function getWidgetState() {
  try {
    const info = {
      mounted: {
        unifiedWidget: document.querySelector('[class*="sree-unified"]') !== null,
        modeSelector: document.querySelector('[role="combobox"]') !== null,
        activeView: document.querySelector('[class*="View"]')?.constructor?.name || 'Unknown'
      },
      desktop: {
        runtime: desktopBridge.getRuntimeType(),
        isDesktop: desktopBridge.isDesktop(),
        bridgeReady: typeof desktopBridge.getScreenContext === 'function'
      },
      voice: {
        hotwordState: hotwordDebugState ? hotwordDebugState() : 'unavailable',
        speechRecognition: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
        speechSynthesis: Boolean(window.speechSynthesis)
      },
      integrations: {
        base44Available: Boolean(window.base44),
        llmRouterLoaded: false, // Will update after dynamic import
        promptProfilesLoaded: false
      },
      timestamp: new Date().toISOString()
    };
    
    // Check if LLM modules are loaded
    try {
      await import('@/components/llm/llmRouter');
      info.integrations.llmRouterLoaded = true;
    } catch {}
    
    try {
      await import('@/components/llm/promptProfiles');
      info.integrations.promptProfilesLoaded = true;
    } catch {}
    
    console.log('[sreeDebug.widget] Widget state:', info);
    return info;
  } catch (error) {
    console.error('[sreeDebug.widget] Error:', error.message);
    return { error: error.message };
  }
}

/**
 * Get desktop bridge state
 */
function getDesktopState() {
  try {
    const state = desktopBridge.debugDump();
    console.log('[sreeDebug.desktop] Desktop bridge state:', state);
    return state;
  } catch (error) {
    console.error('[sreeDebug.desktop] Error:', error.message);
    return { error: error.message };
  }
}

/**
 * Test mode switching
 */
async function testModeSwitch(targetMode) {
  const validModes = ['Sri', 'Sree', 'Text Chat', 'Voice Chat', 'Agentic Sree'];
  
  if (!validModes.includes(targetMode)) {
    console.error('[sreeDebug.testMode] Invalid mode. Valid modes:', validModes);
    return { error: 'Invalid mode', validModes };
  }
  
  try {
    const { base44 } = await import('@/api/base44Client');
    
    console.log('[sreeDebug.testMode] Switching to mode:', targetMode);
    
    // Set mode
    await base44.functions.invoke('setAssistantMode', { mode: targetMode });
    
    // Verify
    const verification = await base44.functions.invoke('getAssistantMode', {});
    
    const result = {
      requested: targetMode,
      saved: verification?.data?.mode,
      success: verification?.data?.mode === targetMode,
      timestamp: new Date().toISOString()
    };
    
    console.log('[sreeDebug.testMode] Result:', result);
    return result;
  } catch (error) {
    console.error('[sreeDebug.testMode] Error:', error.message);
    return { error: error.message };
  }
}

/**
 * Run comprehensive diagnostics
 */
async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('SREE UNIFIED WIDGET DIAGNOSTICS');
  console.log('='.repeat(60));
  
  const results = {
    mode: await getWidgetMode(),
    flags: await getFlags(),
    widget: await getWidgetState(),
    desktop: getDesktopState(),
    timestamp: new Date().toISOString()
  };
  
  console.log('\n📊 DIAGNOSTICS COMPLETE\n');
  console.log('Summary:', {
    modeConfigured: !results.mode.error,
    flagsLoaded: !results.flags.error,
    widgetMounted: !results.widget.error,
    desktopBridgeReady: results.desktop?.runtime !== 'unknown'
  });
  
  console.log('='.repeat(60));
  
  return results;
}

// Initialize global debug object
if (typeof window !== 'undefined') {
  window.sreeDebug = {
    mode: getWidgetMode,
    flags: getFlags,
    widget: getWidgetState,
    desktop: getDesktopState,
    testMode: testModeSwitch,
    diagnostics: runDiagnostics,
    help: () => {
      console.log(`
🔍 Sree Debug Utilities
======================

Available commands:
  window.sreeDebug.mode()              - Get current mode configuration
  window.sreeDebug.flags()             - Get current feature flags
  window.sreeDebug.widget()            - Get widget state and health
  window.sreeDebug.desktop()           - Get desktop bridge state
  window.sreeDebug.testMode('Sri')     - Test mode switching
  window.sreeDebug.diagnostics()       - Run full diagnostics
  window.sreeDebug.help()              - Show this help message

Examples:
  await window.sreeDebug.mode()
  await window.sreeDebug.testMode('Agentic Sree')
  await window.sreeDebug.diagnostics()
      `);
    }
  };
  
  // Enable debug mode for first-time setup
  if (!window.SREE_DEBUG) {
    window.SREE_DEBUG = true;
    console.log('[sreeDebug] Debug mode enabled. Use window.sreeDebug.help() for commands.');
  }
}

export default {
  getWidgetMode,
  getFlags,
  getWidgetState,
  getDesktopState,
  testModeSwitch,
  runDiagnostics
};
