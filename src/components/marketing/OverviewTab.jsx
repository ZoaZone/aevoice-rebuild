import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MessageCircle,
  Phone,
  Share2,
  Video,
  Sparkles
} from "lucide-react";

export default function OverviewTab({
  campaigns,
  googleAiConfigured,
  onCreateCampaign,
  onShowApiKeyDialog
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* AI Tools */}
      <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Marketing Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onCreateCampaign("email")}
          >
            <Mail className="w-4 h-4 mr-2" />
            Generate Email Campaign
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onCreateCampaign("whatsapp")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Generate WhatsApp Broadcast
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onCreateCampaign("voice_call")}
          >
            <Phone className="w-4 h-4 mr-2" />
            Voice Call Campaign
            <Badge className="ml-auto bg-cyan-100 text-cyan-700 text-xs">
              Auto Reminders
            </Badge>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onCreateCampaign("social_media")}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Create Social Posts
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              if (!googleAiConfigured) {
                onShowApiKeyDialog();
              } else {
                onCreateCampaign("video");
              }
            }}
          >
            <Video className="w-4 h-4 mr-2" />
            Generate Marketing Video (AI)
            {!googleAiConfigured && (
              <Badge className="ml-auto bg-amber-100 text-amber-700 text-xs">
                Setup Required
              </Badge>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No campaigns yet
            </p>
          ) : (
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    {campaign.type === "email" && (
                      <Mail className="w-4 h-4 text-purple-500" />
                    )}
                    {campaign.type === "whatsapp" && (
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    )}
                    {campaign.type === "voice_call" && (
                      <Phone className="w-4 h-4 text-cyan-500" />
                    )}
                    {campaign.type === "social_media" && (
                      <Share2 className="w-4 h-4 text-blue-500" />
                    )}
                    {campaign.type === "video" && (
                      <Video className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{campaign.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {campaign.type?.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      campaign.status === "running"
                        ? "default"
                        : campaign.status === "completed"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {campaign.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}