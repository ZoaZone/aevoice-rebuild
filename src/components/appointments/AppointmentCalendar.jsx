import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppointmentCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const startOfWeek = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const endOfWeek = useMemo(() => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + 7);
    return d;
  }, [startOfWeek]);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointmentsWeek", startOfWeek.toISOString()],
    queryFn: () => base44.entities.Appointment.list("-appointment_date", 500),
  });

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [startOfWeek]);

  const getAppointmentsForDay = (day) => {
    const dayStr = day.toISOString().slice(0, 10);
    return appointments.filter((a) => {
      const aptDate = new Date(a.appointment_date);
      return aptDate.toISOString().slice(0, 10) === dayStr;
    });
  };

  const statusColors = {
    scheduled: "bg-blue-50 border-blue-200",
    confirmed: "bg-green-50 border-green-200",
    reminded: "bg-amber-50 border-amber-200",
    completed: "bg-emerald-50 border-emerald-200",
    cancelled: "bg-red-50 border-red-200",
    no_show: "bg-slate-50 border-slate-200",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Week View
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {startOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {endOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-4">
        {isLoading && (
          <div className="grid grid-cols-7 gap-2 min-w-[800px]">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-7 gap-2 min-w-[800px]">
            {days.map((day) => {
              const dayApts = getAppointmentsForDay(day);
              const isToday = day.toDateString() === today.toDateString();

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border rounded-lg p-2 min-h-[200px] flex flex-col",
                    isToday && "border-indigo-300 bg-indigo-50/30"
                  )}
                >
                  <div className={cn("text-sm font-medium mb-2", isToday && "text-indigo-700")}>
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                    <span className="ml-1 text-slate-400">
                      {day.toLocaleDateString(undefined, { day: "numeric" })}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[180px]">
                    {dayApts.length === 0 && (
                      <div className="text-[10px] text-slate-400 text-center py-4">No appointments</div>
                    )}

                    {dayApts.map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "border rounded px-2 py-1 text-xs",
                          statusColors[apt.status] || "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium">
                            {new Date(apt.appointment_date).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {apt.status}
                          </Badge>
                        </div>
                        <div className="font-medium truncate mt-0.5">
                          {apt.customer_name || apt.customer_email || apt.customer_phone || "Unknown"}
                        </div>
                        {apt.service_type && (
                          <div className="text-[10px] text-slate-500 truncate">{apt.service_type}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}