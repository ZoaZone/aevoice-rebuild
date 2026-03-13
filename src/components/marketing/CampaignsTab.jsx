import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  MessageCircle,
  Phone,
  Share2,
  Video,
  Activity,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CampaignsTab({
  campaigns,
  isLoading,
  isError,
  onCreateCampaign
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 py-8 justify-center">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load campaigns. Please try again.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Campaigns</CardTitle>
        <CardDescription>View and manage all marketing campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              No campaigns yet
            </h3>
            <p className="text-slate-500 mb-4">
              Create your first AI-powered campaign
            </p>
            <Button onClick={() => onCreateCampaign("email")}>
              <Sparkles className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignRow({ campaign }) {
  const typeConfig = {
    email: { icon: Mail, color: "purple" },
    whatsapp: { icon: MessageCircle, color: "green" },
    voice_call: { icon: Phone, color: "cyan" },
    social_media: { icon: Share2, color: "blue" },
    video: { icon: Video, color: "red" }
  };

  const config = typeConfig[campaign.type] || typeConfig.email;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between p-4 border rounded-xl hover:border-indigo-300 transition-all">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            `bg-${config.color}-100`
          )}
          style={{
            backgroundColor:
              config.color === "purple"
                ? "#f3e8ff"
                : config.color === "green"
                ? "#dcfce7"
                : config.color === "cyan"
                ? "#cffafe"
                : config.color === "blue"
                ? "#dbeafe"
                : "#fee2e2"
          }}
        >
          <Icon
            className="w-6 h-6"
            style={{
              color:
                config.color === "purple"
                  ? "#9333ea"
                  : config.color === "green"
                  ? "#16a34a"
                  : config.color === "cyan"
                  ? "#0891b2"
                  : config.color === "blue"
                  ? "#2563eb"
                  : "#dc2626"
            }}
          />
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{campaign.name}</h3>
          <p className="text-sm text-slate-500 capitalize">
            {campaign.type?.replace("_", " ")} •{" "}
            {new Date(campaign.created_date).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
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
        {campaign.stats && (
          <div className="text-sm text-slate-600">
            {campaign.stats.sent || 0} sent
          </div>
        )}
      </div>
    </div>
  );
}