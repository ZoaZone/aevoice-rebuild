import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, Bot, BookText, Phone, Settings } from "lucide-react";
import { createPageUrl } from "@/utils";

const NavItem = ({ to, icon: Icon, label, active }) => (
  <Link to={createPageUrl(to)} className={cn(
    "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
    active ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"
  )}>
    <Icon className="h-4 w-4" />
    <span>{label}</span>
  </Link>
);

export default function Sidebar({ user, currentPageName }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col w-full h-screen p-4">
        <div className="mb-4">
          <div className="text-xs uppercase text-slate-500">AEVOICE</div>
          <div className="text-sm font-semibold text-slate-900">Control Panel</div>
        </div>

        <nav className="space-y-1">
          <NavItem to="Dashboard" icon={Home} label="Dashboard" active={currentPageName === "Dashboard"} />
          <NavItem to="Agents" icon={Bot} label="Agents" active={currentPageName === "Agents"} />
          <NavItem to="Knowledge" icon={BookText} label="Knowledge" active={currentPageName === "Knowledge"} />
          <NavItem to="CallHistory" icon={Phone} label="Call History" active={currentPageName === "CallHistory"} />
          <NavItem to="Settings" icon={Settings} label="Settings" active={currentPageName === "Settings"} />
        </nav>

        <div className="mt-auto pt-4 border-t">
          <div className="text-xs text-slate-500 mb-2">Signed in</div>
          <div className="text-sm text-slate-700 truncate">{user?.email || "Guest"}</div>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <a href={createPageUrl("Home")}>Go to Website</a>
          </Button>
        </div>
      </div>
    </aside>
  );
}