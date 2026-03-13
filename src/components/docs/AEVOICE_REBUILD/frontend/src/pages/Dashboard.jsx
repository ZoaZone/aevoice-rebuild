import { useQuery } from '@tanstack/react-query';
import base44 from '@/api/base44Client';
import { useSession } from '@/hooks/useSession';
import { Bot, BookOpen, Phone, Activity } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, client } = useSession();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.listEntities('Agent'),
    enabled: base44.isAuthenticated(),
  });

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['knowledgeBases'],
    queryFn: () => base44.listEntities('KnowledgeBase'),
    enabled: base44.isAuthenticated(),
  });

  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const activeKBs    = knowledgeBases.filter((kb) => kb.status === 'active').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {client?.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Agents"     value={agents.length}          icon={Bot}      color="bg-indigo-500" />
        <StatCard label="Active Agents"    value={activeAgents}           icon={Activity} color="bg-green-500" />
        <StatCard label="Knowledge Bases"  value={knowledgeBases.length}  icon={BookOpen} color="bg-amber-500" />
        <StatCard label="Active KBs"       value={activeKBs}              icon={Phone}    color="bg-sky-500" />
      </div>

      {/* Agents Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">AI Agents</h2>
          <span className="text-xs text-slate-500">{agents.length} total</span>
        </div>
        {agents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No agents created yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {agents.slice(0, 8).map((agent) => (
              <div key={agent.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm truncate">{agent.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{agent.agent_type}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  agent.status === 'active'   ? 'bg-green-100 text-green-700'  :
                  agent.status === 'inactive' ? 'bg-slate-100 text-slate-600'  :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}