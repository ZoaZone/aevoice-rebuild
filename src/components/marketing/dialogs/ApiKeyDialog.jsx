import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video } from "lucide-react";

export default function ApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
  setApiKey,
  onSave,
  isSaving
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-red-600" />
            Configure Google AI for Video Generation
          </DialogTitle>
          <DialogDescription>
            Enter your Google AI API key to enable AI video generation with Veo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              How to get your Google AI API key:
            </h4>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside">
              <li>
                Visit{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-medium"
                >
                  Google AI Studio
                </a>
              </li>
              <li>Sign in with your Google account</li>
              <li>
                Click <strong>"Get API Key"</strong> or{" "}
                <strong>"Create API Key"</strong>
              </li>
              <li>Copy the generated key (starts with "AIza...")</li>
              <li>Paste it in the field below</li>
            </ol>
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <strong>Note:</strong> Your API key is encrypted and stored
              securely. You will be charged by Google based on your video
              generation usage.
            </div>
          </div>

          <div className="space-y-2">
            <Label>Google AI API Key</Label>
            <Input
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Your API key is encrypted and stored securely
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!apiKey || isSaving}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSaving ? "Saving..." : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}