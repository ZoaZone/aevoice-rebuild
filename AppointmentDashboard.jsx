import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, CheckCircle2, XCircle, Users } from "lucide-react";

export default function AppointmentDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["appointmentStats"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getAppointmentStats", {});
      return res.data?.stats || {};
    },
  });

  const { data: appointments = [], isLoading: apptLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => base44.entities.Appointment.list("-appointment_date", 100),
  });

  const upcomingAppointments = appointments.filter((a) =>
    ["scheduled", "confirmed", "reminded", "rescheduled"].includes(a.status)
  );

  const statCards = [
    { label: "Total", value: stats?.total, icon: Calendar, color: "blue" },
    { label: "Upcoming", value: stats?.upcoming, icon: Clock, color: "indigo" },
    { label: "Today", value: stats?.today, icon: Users, color: "amber" },
    { label: "Completed", value: stats?.completed, icon: CheckCircle2, color: "green" },
    { label: "Cancelled", value: stats?.cancelled, icon: XCircle, color: "red" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-${stat.color}-100`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value ?? 0}</p>
                  )}
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Upcoming Appointments
          </CardTitle>
          <CardDescription>
            Next {Math.min(upcomingAppointments.length, 50)} scheduled visits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
          {apptLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!apptLoading && upcomingAppointments.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No upcoming appointments</p>
              <p className="text-xs mt-1">Appointments booked via AI calls will appear here</p>
            </div>
          )}

          {upcomingAppointments.slice(0, 50).map((apt) => (
            <AppointmentRow key={apt.id} appointment={apt} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentRow({ appointment }) {
  const statusColors = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    reminded: "bg-amber-100 text-amber-700",
    rescheduled: "bg-purple-100 text-purple-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-slate-100 text-slate-700",
  };

  const date = new Date(appointment.appointment_date);

  return (
    <div className="flex items-center justify-between text-sm border rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {appointment.customer_name || appointment.customer_email || appointment.customer_phone || "Unknown"}
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3" />
          {date.toLocaleDateString(undefined, { dateStyle: "medium" })} at{" "}
          {date.toLocaleTimeString(undefined, { timeStyle: "short" })}
          {appointment.service_type && (
            <>
              <span className="text-slate-300">•</span>
              {appointment.service_type}
            </>
          )}
        </div>
      </div>
      <Badge className={statusColors[appointment.status] || "bg-slate-100 text-slate-700"}>
        {appointment.status}
      </Badge>
    </div>
  );
}