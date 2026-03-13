import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function VoiceProfileSettings({ open, onOpenChange, profile, onSave }) {
  const handleSave = () => {
    onSave(profile);
    onOpenChange(false);
  };

  const handleProfileChange = (key, value) => {
    onSave({ ...profile, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Voice Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Voice Selection */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Voice Profile</Label>
            <Select value={profile.voiceId} onValueChange={(val) => handleProfileChange('voiceId', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Natural)</SelectItem>
                <SelectItem value="warm">Warm & Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="upbeat">Upbeat & Energetic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Speech Rate */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Speech Rate: {profile.speechRate.toFixed(1)}x</Label>
            <Slider
              value={[profile.speechRate]}
              onValueChange={(val) => handleProfileChange('speechRate', val[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">0.5 = Slow, 1.0 = Normal, 2.0 = Fast</p>
          </div>

          {/* Pitch */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Pitch: {profile.pitch.toFixed(1)}</Label>
            <Slider
              value={[profile.pitch]}
              onValueChange={(val) => handleProfileChange('pitch', val[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">0.5 = Deep, 1.0 = Normal, 2.0 = High</p>
          </div>

          {/* Volume */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Volume: {Math.round(profile.volume * 100)}%</Label>
            <Slider
              value={[profile.volume]}
              onValueChange={(val) => handleProfileChange('volume', val[0])}
              min={0.1}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>

          <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700">
            Apply Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}