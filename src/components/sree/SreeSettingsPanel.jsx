import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

const MODE_OPTIONS = [
  'Sri (Text Chat)',
  'Sri (Voice Chat)',
  'Sree (Local Knowledge)',
  'AI Sree (Agentic Assistant)'
];

function newToLegacy(m){
  switch (m) {
    case 'Sri (Text Chat)': return 'Sri';
    case 'Sri (Voice Chat)': return 'Voice Chat';
    case 'Sree (Local Knowledge)': return 'Sree';
    case 'AI Sree (Agentic Assistant)': return 'Agentic Sree';
    default: return m;
  }
}

export default function SreeSettingsPanel({ open, onOpenChange, mode, onModeChange }){
  const [theme, setTheme] = useState('auto');
  const [defaultMode, setDefaultMode] = useState(mode || MODE_OPTIONS[0]);
  const [enableHotword, setEnableHotword] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [greeting, setGreeting] = useState('Hi! I\'m Sree. How can I help?');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sree_settings');
      if (raw){
        const s = JSON.parse(raw);
        if (s.theme) setTheme(s.theme);
        if (s.defaultMode) setDefaultMode(s.defaultMode);
        if (typeof s.enableHotword === 'boolean') setEnableHotword(s.enableHotword);
        if (typeof s.enableNotifications === 'boolean') setEnableNotifications(s.enableNotifications);
        if (s.greeting) setGreeting(s.greeting);
        if (s.avatarUrl) setAvatarUrl(s.avatarUrl);
      }
    } catch (_) {}
  }, [open]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { theme, defaultMode, enableHotword, enableNotifications, greeting, avatarUrl };
    localStorage.setItem('sree_settings', JSON.stringify(data));

    try {
      // Persist lightweight user prefs
      await base44.auth.updateMe({ sree_settings: data, sree_avatar_url: avatarUrl });
      // Persist default mode to backend
      if (defaultMode && defaultMode !== mode) {
        await base44.functions.invoke('setAssistantMode', { mode: newToLegacy(defaultMode) });
        onModeChange?.(defaultMode);
        window.dispatchEvent(new CustomEvent('sree:setMode', { detail: defaultMode }));
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000, background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }} >
        <DialogHeader>
          <DialogTitle>Sree Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Mode</Label>
              <Select value={defaultMode} onValueChange={setDefaultMode}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium text-sm">Hotword</div>
                <div className="text-xs text-slate-500">Say "Hey Sree" to start</div>
              </div>
              <Switch checked={enableHotword} onCheckedChange={setEnableHotword} />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium text-sm">Notifications</div>
                <div className="text-xs text-slate-500">Desktop alerts</div>
              </div>
              <Switch checked={enableNotifications} onCheckedChange={setEnableNotifications} />
            </div>
          </div>

          <div>
            <Label>Greeting</Label>
            <Input className="mt-1" value={greeting} onChange={(e)=>setGreeting(e.target.value)} placeholder="How can I help?" />
          </div>

          <div>
            <Label>Avatar / Logo</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover"/> : <span className="text-xs text-slate-400">None</span>}
              </div>
              <Button type="button" variant="outline" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/png,image/jpeg';
                input.onchange = () => handleUpload(input.files?.[0]);
                input.click();
              }}>Upload</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}