import { Monitor, Activity, Zap, Target, Check, X, Database, Layers } from 'lucide-react';

export default function SreeMiniMonitorPanel({ screenContext }) {
  // Feature status - these should be dynamic based on actual availability
  const features = [
    { name: 'Screen Context', enabled: !!screenContext, icon: Monitor },
    { name: 'Knowledge Base', enabled: true, icon: Database },
    { name: 'Screen Overlay', enabled: false, icon: Layers }, // Desktop-only feature
  ];

  return (
    <div className="mini-monitor-panel" style={{
      width: '100%',
      height: '100%',
      background: 'rgba(30, 30, 46, 0.95)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '12px',
      overflowY: 'auto'
    }}>
      <div className="flex items-center gap-2 mb-4">
        <Monitor size={18} color="#A78BFA" />
        <span style={{color: 'white', fontSize: '14px', fontWeight: 600}}>Mini Monitor</span>
      </div>

      {/* Feature Status Section */}
      <div className="mb-4">
        <div style={{color: '#94A3B8', fontSize: '11px', marginBottom: '8px'}}>Features</div>
        <div className="space-y-1">
          {features.map((feature) => {
            const Icon = feature.icon;
            const StatusIcon = feature.enabled ? Check : X;
            return (
              <div 
                key={feature.name}
                className="flex items-center gap-2 text-xs p-2 rounded"
                style={{
                  background: 'rgba(100, 116, 139, 0.2)',
                  border: '1px solid rgba(100, 116, 139, 0.3)'
                }}
              >
                <Icon size={12} color={feature.enabled ? '#86EFAC' : '#94A3B8'} />
                <span style={{color: feature.enabled ? '#86EFAC' : '#94A3B8', flex: 1}}>
                  {feature.name}
                </span>
                <StatusIcon size={12} color={feature.enabled ? '#86EFAC' : '#EF4444'} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Screen Context Section */}
      <div className="context-card" style={{
        background: 'rgba(100, 116, 139, 0.2)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px'
      }}>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} color="#60A5FA" />
          <span style={{color: '#94A3B8', fontSize: '11px'}}>Active Window</span>
        </div>
        <div style={{color: 'white', fontSize: '13px'}}>
          {screenContext?.activeWindow || screenContext?.currentApp || screenContext?.currentScreen || 'No window detected'}
        </div>
        {screenContext && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-xs text-slate-300 border border-slate-700 rounded-md p-2">
              <div className="text-[10px] text-slate-400">App</div>
              <div>{screenContext.currentApp || 'N/A'}</div>
            </div>
            <div className="text-xs text-slate-300 border border-slate-700 rounded-md p-2">
              <div className="text-[10px] text-slate-400">Screen</div>
              <div>{screenContext.currentScreen || 'N/A'}</div>
            </div>
          </div>
        )}
        {!screenContext && (
          <div className="mt-2 text-xs text-slate-400 italic">
            Screen context polling active...
          </div>
        )}
      </div>

      {/* Quick Actions Section */}
      <div className="mb-4">
        <div style={{color: '#94A3B8', fontSize: '11px', marginBottom: '8px'}}>Quick Actions</div>
        <div className="grid gap-2">
          <button style={{
            background: 'rgba(79, 70, 229, 0.2)',
            border: '1px solid rgba(79, 70, 229, 0.4)',
            borderRadius: '6px',
            padding: '8px',
            color: '#A78BFA',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            <Zap size={12} style={{display: 'inline', marginRight: '6px'}} />
            Capture Screen
          </button>
          <button style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '6px',
            padding: '8px',
            color: '#86EFAC',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            <Target size={12} style={{display: 'inline', marginRight: '6px'}} />
            Suggest Action
          </button>
        </div>
      </div>

      {/* Recent Captures Section */}
      <div>
        <div style={{color: '#94A3B8', fontSize: '11px', marginBottom: '8px'}}>Recent Captures</div>
        <div style={{color: '#64748B', fontSize: '11px', fontStyle: 'italic'}}>No captures yet</div>
      </div>
    </div>
  );
}