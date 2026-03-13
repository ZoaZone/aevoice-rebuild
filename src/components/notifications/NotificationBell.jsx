import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Check, CheckCheck, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { NOTIF_TYPE_META } from "./notificationMeta";

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["userNotifications", user?.email],
    queryFn: () =>
      base44.entities.UserNotification.filter(
        { recipient_email: user.email, status: "unread" },
        "-created_date",
        20
      ),
    enabled: !!user?.email,
    refetchInterval: 30_000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.UserNotification.subscribe((event) => {
      if (event.data?.recipient_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
        // Play a subtle sound if enabled (non-blocking)
        try {
          const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...");
          audio.volume = 0.2;
          audio.play().catch(() => {});
        } catch {}
      }
    });
    return unsub;
  }, [user?.email]);

  const markReadMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.UserNotification.update(id, {
        status: "read",
        read_at: new Date().toISOString(),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        notifications.map((n) =>
          base44.entities.UserNotification.update(n.id, {
            status: "read",
            read_at: new Date().toISOString(),
          })
        )
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
  });

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0 shadow-xl" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-white">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            <p className="text-xs text-slate-500">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <Link to={createPageUrl("Notifications")} onClick={() => setOpen(false)}>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </Link>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">You're all caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => {
                const meta = NOTIF_TYPE_META[notif.type] || NOTIF_TYPE_META.system_alert;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group",
                      notif.status === "unread" && "bg-indigo-50/40"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg mt-0.5 shrink-0", meta.bg)}>
                      <meta.icon className={cn("w-3.5 h-3.5", meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">{notif.title}</p>
                        <PriorityDot priority={notif.priority} />
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {notif.action_url && (
                            <Link
                              to={createPageUrl(notif.action_url)}
                              onClick={() => { markReadMutation.mutate(notif.id); setOpen(false); }}
                              className="text-[10px] text-indigo-600 hover:underline font-medium"
                            >
                              {notif.action_label || "View"}
                            </Link>
                          )}
                          <button
                            onClick={() => markReadMutation.mutate(notif.id)}
                            className="p-0.5 hover:bg-indigo-100 rounded"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3 text-indigo-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-slate-50">
          <Link to={createPageUrl("Notifications")} onClick={() => setOpen(false)}>
            <Button variant="outline" size="sm" className="w-full text-xs h-7">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PriorityDot({ priority }) {
  if (!priority || priority === "medium" || priority === "low") return null;
  return (
    <span className={cn(
      "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
      priority === "urgent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
    )}>
      {priority.toUpperCase()}
    </span>
  );
}