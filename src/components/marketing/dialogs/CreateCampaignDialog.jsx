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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Zap, Phone, Mail, MessageCircle, Share2, Video } from "lucide-react";

export default function CreateCampaignDialog({
  open,
  onOpenChange,
  campaignData,
  setCampaignData,
  agents,
  phoneNumbers,
  onGenerateContent,
  generatingContent
}) {
  const handleChange = (field, value) => {
    setCampaignData({ ...campaignData, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Create AI-Powered Campaign
          </DialogTitle>
          <DialogDescription>
            Describe your campaign and let AI generate the content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input
              placeholder="e.g., Summer Sale 2025"
              value={campaignData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          {/* Campaign Type */}
          <div className="space-y-2">
            <Label>Campaign Type *</Label>
            <Select
              value={campaignData.type}
              onValueChange={(v) => handleChange("type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Campaign
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> WhatsApp Broadcast
                  </div>
                </SelectItem>
                <SelectItem value="voice_call">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Voice Call Campaign
                  </div>
                </SelectItem>
                <SelectItem value="social_media">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Social Media Posts
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" /> Video Script
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AI Prompt */}
          <div className="space-y-2">
            <Label>Describe Your Campaign *</Label>
            <Textarea
              placeholder="e.g., Promote our new AI voice assistant with 20% discount for first-time users..."
              value={campaignData.ai_prompt}
              onChange={(e) => handleChange("ai_prompt", e.target.value)}
              rows={4}
            />
          </div>

          {/* Type-specific Fields */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-4">
            <h4 className="font-medium text-slate-900 text-sm">
              Campaign Settings
            </h4>

            {/* Email From */}
            {campaignData.type === "email" && (
              <div className="space-y-2">
                <Label>From Email Address *</Label>
                <Input
                  type="email"
                  placeholder="noreply@yourbusiness.com"
                  value={campaignData.from_email}
                  onChange={(e) => handleChange("from_email", e.target.value)}
                />
              </div>
            )}

            {/* WhatsApp Phone */}
            {campaignData.type === "whatsapp" && (
              <div className="space-y-2">
                <Label>Select Phone Number *</Label>
                <Select
                  value={campaignData.phone_number_id}
                  onValueChange={(v) => handleChange("phone_number_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a phone number" />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneNumbers.map((num) => (
                      <SelectItem key={num.id} value={num.id}>
                        {num.number_e164}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Voice Call Settings */}
            {campaignData.type === "voice_call" && (
              <div className="space-y-3">
                <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                  <h4 className="text-sm font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Voice Call Campaign Types
                  </h4>
                  <ul className="text-xs text-cyan-800 space-y-1">
                    <li>• Auto reminders from CRM (appointments, payments)</li>
                    <li>• Bulk voice wishes (birthdays, holidays)</li>
                    <li>• Automated information broadcasts</li>
                    <li>• Follow-up calls for leads/customers</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label>Select AI Agent for Calls *</Label>
                  <Select
                    value={campaignData.agent_id}
                    onValueChange={(v) => handleChange("agent_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an AI agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Calling Phone Number *</Label>
                  <Select
                    value={campaignData.phone_number_id}
                    onValueChange={(v) => handleChange("phone_number_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select outbound number" />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbers.map((num) => (
                        <SelectItem key={num.id} value={num.id}>
                          {num.number_e164} - {num.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Schedule Send (Optional)</Label>
              <Input
                type="datetime-local"
                value={campaignData.schedule_date}
                onChange={(e) => handleChange("schedule_date", e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Leave empty to save as draft
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Target Audience Tags (Optional)</Label>
              <Input
                placeholder="e.g., vip, newsletter, prospects"
                value={campaignData.target_tags?.join(", ") || ""}
                onChange={(e) =>
                  handleChange(
                    "target_tags",
                    e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                  )
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onGenerateContent}
            disabled={
              !campaignData.name || !campaignData.ai_prompt || generatingContent
            }
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            {generatingContent ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}