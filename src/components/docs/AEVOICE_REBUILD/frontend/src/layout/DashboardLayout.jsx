import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { LayoutDashboard, Settings, LogOut, Phone } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Settings',  href: '/settings',  icon: Settings },
];

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardLayout() {
  const { user, client, isAuthenticated, isLoading, logout } = useSession();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">AEVOICE</div>
            <div className="text-xs text-indigo-600">AI Voice Platform</div>
          </div>
        </div>

        {/* Client badge */}
        {client && (
          <div className="mx-3 my-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500">Workspace</div>
            <div className="text-sm font-medium text-slate-800 truncate">{client.name}</div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = location.pathname === href || location.pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-200 px-3 py-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-indigo-700 text-xs font-semibold">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{user?.full_name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}