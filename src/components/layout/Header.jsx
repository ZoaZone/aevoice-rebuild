import { Button } from "@/components/ui/button";
import { Bell, User } from "lucide-react";

export default function Header({ user }) {
  return (
    <header className="h-14 border-b bg-white/70 backdrop-blur-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-2 text-slate-700">
        <span className="font-semibold">AEVOICE</span>
        <span className="text-slate-400">/ Dashboard</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white">
          <User className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-700">{user?.full_name || user?.email || "Guest"}</span>
        </div>
      </div>
    </header>
  );
}