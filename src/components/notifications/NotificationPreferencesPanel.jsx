import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, BellOff, Mail, Volume2, Moon } from "lucide-react";
import { NOTIF_TYPE_META } from "./notificationMeta";
import { cn } from "@/lib/utils";

const DEFAULT_PREFS = {
  enabled: true,
  task_assigned: true,
  deadline_approaching: true,
  status_change: true,
  mention: true,
  agent_update: true,
  call_summary: true,
  knowledge_update: false,
  billing_alert: true,
  system_alert: true,
  new_message: true,
  email_enabled: false,
  sound_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
};

export default function NotificationPreferencesPanel() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["notifPrefs", user?.email],
    queryFn: () =>
      base44.entities.NotificationPreferences.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const prefs = existing[0] || null;
  const [form, setForm] = useState(DEFAULT_PREFS);

  useEffect(() => {
    if (prefs) setForm({ ...DEFAULT_PREFS, ...prefs });
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (prefs?.id) {
        return base44.entities.NotificationPreferences.update(prefs.id, data);
      } else {
        return base44.entities.NotificationPreferences.create({
          ...data,
          user_email: user.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifPrefs"] });
      toast.success("Preferences saved");
    },
  });

  const toggle = (key) => setForm((f) => ({ ...f, [key]: !f[key] }));

  const notifTypes = Object.entries(NOTIF_TYPE_META);

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-white rounded-xl border border-indigo-100">
        <div className="flex items-center gap-3">
          {form.enabled ? (
            <Bell className="w-5 h-5 text-indigo-600" />
          ) : (
            <BellOff className="w-5 h-5 text-slate-400" />
          )}
          <div>
            <p className="font-semibold text-slate-900">In-App Notifications</p>
            <p className="text-xs text-slate-500">
              {form.enabled ? "Notifications are active" : "All notifications are muted"}
            </p>
          </div>
        </div>
        <Switch
          checked={form.enabled}
          onCheckedChange={() => toggle("enabled")}
        />
      </div>

      {/* Delivery preferences */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Delivery</h4>
        <div className="space-y-3">
          <PrefsRow
            icon={<Mail className="w-4 h-4 text-slate-500" />}
            label="Email for urgent alerts"
            description="Receive email copies of high-priority notifications"
            checked={form.email_enabled}
            onChange={() => toggle("email_enabled")}
            disabled={!form.enabled}
          />
          <PrefsRow
            icon={<Volume2 className="w-4 h-4 text-slate-500" />}
            label="Sound alerts"
            description="Play a sound when a new notification arrives"
            checked={form.sound_enabled}
            onChange={() => toggle("sound_enabled")}
            disabled={!form.enabled}
          />
        </div>
      </div>

      {/* Quiet hours */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Quiet Hours</h4>
        <div className="space-y-3">
          <PrefsRow
            icon={<Moon className="w-4 h-4 text-slate-500" />}
            label="Enable quiet hours"
            description="Suppress notifications during specified hours"
            checked={form.quiet_hours_enabled}
            onChange={() => toggle("quiet_hours_enabled")}
            disabled={!form.enabled}
          />
          {form.quiet_hours_enabled && (
            <div className="flex items-center gap-3 pl-7">
              <div>
                <Label className="text-xs text-slate-600">From</Label>
                <Input
                  type="time"
                  value={form.quiet_hours_start}
                  onChange={(e) => setForm((f) => ({ ...f, quiet_hours_start: e.target.value }))}
                  className="h-8 text-xs mt-1 w-32"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Until</Label>
                <Input
                  type="time"
                  value={form.quiet_hours_end}
                  onChange={(e) => setForm((f) => ({ ...f, quiet_hours_end: e.target.value }))}
                  className="h-8 text-xs mt-1 w-32"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-type toggles */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Notification Types</h4>
        <div className="space-y-2">
          {notifTypes.map(([key, meta]) => (
            <PrefsRow
              key={key}
              icon={<meta.icon className={cn("w-4 h-4", meta.color)} />}
              label={meta.label}
              checked={form[key] !== false}
              onChange={() => toggle(key)}
              disabled={!form.enabled}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate(form)}
        disabled={saveMutation.isPending}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {saveMutation.isPending ? "Saving…" : "Save Preferences"}
      </Button>
    </div>
  );
}

function PrefsRow({ icon, label, description, checked, onChange, disabled }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-white", disabled && "opacity-50")}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm text-slate-800">{label}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <Switch checked={!!checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}