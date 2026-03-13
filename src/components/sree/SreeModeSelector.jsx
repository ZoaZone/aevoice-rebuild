import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trackEvent } from "@/components/telemetry/telemetry";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Mic, Database, Sparkles } from "lucide-react";

export default function SreeModeSelector({ mode, onChange, disabledOptions = [], persistToBackend = false }) {
  const options = [
    'Sri (Text Chat)',
    'Sri (Voice Chat)',
    'Sree (Local Knowledge)',
    'AI Sree (Agentic Assistant)',
  ];

  const iconMap = {
    'Sri (Text Chat)': MessageSquare,
    'Sri (Voice Chat)': Mic,
    'Sree (Local Knowledge)': Database,
    'AI Sree (Agentic Assistant)': Sparkles,
  };

  const legacyToNew = (m) => {
    switch (m) {
      case 'Sri':
      case 'Text Chat':
        return 'Sri (Text Chat)';
      case 'Voice Chat':
        return 'Sri (Voice Chat)';
      case 'Sree':
        return 'Sree (Local Knowledge)';
      case 'Agentic Sree':
        return 'AI Sree (Agentic Assistant)';
      default:
        return m;
    }
  };
  const newToLegacy = (m) => {
    switch (m) {
      case 'Sri (Text Chat)':
        return 'Sri';
      case 'Sri (Voice Chat)':
        return 'Voice Chat';
      case 'Sree (Local Knowledge)':
        return 'Sree';
      case 'AI Sree (Agentic Assistant)':
        return 'Agentic Sree';
      default:
        return m;
    }
  };

  // Load saved mode from backend on mount if persistToBackend is enabled
  useEffect(() => {
    if (!persistToBackend) return;
    let mounted = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('getAssistantMode', {});
        const loaded = legacyToNew(res?.data?.mode);
        if (mounted && loaded && loaded !== mode) {
          if (window.SREE_DEBUG) {
            console.log('[SreeModeSelector] Loaded saved mode from backend:', loaded);
          }
          onChange?.(loaded);
        }
      } catch (error) {
        if (window.SREE_DEBUG) {
          console.warn('[SreeModeSelector] Failed to load mode from backend:', error);
        }
      }
    })();
    return () => { mounted = false; };
  }, [persistToBackend]); // Only run on mount


  const handleChange = async (value) => {
    trackEvent('assistantModeChanged', { mode: value });
    const legacy = newToLegacy(value);
    // Persist to backend if enabled
    if (persistToBackend) {
      try {
        await base44.functions.invoke('setAssistantMode', { mode: legacy });
        if (window.SREE_DEBUG) {
          console.log('[SreeModeSelector] Persisted mode to backend:', legacy);
        }
      } catch (error) {
        if (window.SREE_DEBUG) {
          console.error('[SreeModeSelector] Failed to persist mode:', error);
        }
      }
    }
    onChange?.(value);
  };

  return (
    <div className="w-full max-w-xs">
      <Select value={mode} onValueChange={handleChange}>
        {/* ensure portal renders above widget */}
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose mode" />
        </SelectTrigger>
        <SelectContent className="z-[10010]">
          {options.map((opt) => {
            const Icon = iconMap[opt];
            return (
              <SelectItem key={opt} value={opt} disabled={disabledOptions.includes(opt)}>
                <div className="flex items-center gap-2">
                  {Icon ? <Icon className="w-4 h-4" /> : null}
                  <span>{opt}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}