import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function AdminNotificationBell() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: () => base44.entities.AdminNotification.filter({ status: 'unread' }, '-created_date', 10),
    enabled: user?.role === 'admin',
    refetchInterval: 30000,
  });

  if (user?.role !== 'admin') return null;

  const unreadCount = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-slate-900">Admin Notifications</h3>
          <p className="text-xs text-slate-500">{unreadCount} unread</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No new notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      notif.priority === 'urgent' ? 'bg-red-100' :
                      notif.priority === 'high' ? 'bg-amber-100' :
                      'bg-blue-100'
                    }`}>
                      <Bell className={`w-4 h-4 ${
                        notif.priority === 'urgent' ? 'text-red-600' :
                        notif.priority === 'high' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{notif.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {format(new Date(notif.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Link to={createPageUrl("AdminDashboard")}>
              <Button variant="outline" className="w-full text-sm">
                View All in Dashboard
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}