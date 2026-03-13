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
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";

export default function DraftEditorDialog({
  open,
  onOpenChange,
  draftContent,
  setDraftContent,
  campaignType,
  onBack,
  onSaveDraft,
  onSend,
  isSending,
  contactCount
}) {
  const handleChange = (field, value) => {
    setDraftContent({ ...draftContent, [field]: value });
  };

  const getButtonLabel = () => {
    if (isSending) return "Sending...";
    if (campaignType === "whatsapp") return "Send WhatsApp Campaign";
    if (campaignType === "email") return "Send Email Campaign";
    return "Save Campaign";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Review & Edit Campaign Draft
          </DialogTitle>
          <DialogDescription>
            Review the AI-generated content and make any necessary edits before
            sending
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject Line</Label>
            <Input
              value={draftContent.subject || ""}
              onChange={(e) => handleChange("subject", e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Email Body</Label>
            <Textarea
              value={draftContent.body || ""}
              onChange={(e) => handleChange("body", e.target.value)}
              placeholder="Email content..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Call-to-Action Text</Label>
              <Input
                value={draftContent.cta_text || ""}
                onChange={(e) => handleChange("cta_text", e.target.value)}
                placeholder="e.g., Learn More"
              />
            </div>
            <div className="space-y-2">
              <Label>CTA Link URL</Label>
              <Input
                value={draftContent.cta_url || ""}
                onChange={(e) => handleChange("cta_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Media URL */}
          {draftContent.media_url && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-blue-900">
                Media Attachment
              </Label>
              <a
                href={draftContent.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-1 block"
              >
                {draftContent.media_url}
              </a>
            </div>
          )}

          {/* Contact Count Info */}
          {contactCount > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              This campaign will be sent to <strong>{contactCount}</strong>{" "}
              {campaignType === "whatsapp" ? "WhatsApp subscribers" : "email subscribers"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onBack}>
            ← Back to Edit
          </Button>
          <Button variant="outline" onClick={onSaveDraft}>
            Save as Draft
          </Button>
          <Button
            onClick={onSend}
            disabled={isSending || contactCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {getButtonLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}