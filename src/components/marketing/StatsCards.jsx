import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Mail, MessageCircle } from "lucide-react";

export default function StatsCards({ stats }) {
  const cards = [
    {
      label: "Total Contacts",
      value: stats.totalContacts,
      icon: Users,
      color: "blue"
    },
    {
      label: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: TrendingUp,
      color: "emerald"
    },
    {
      label: "Email Subscribers",
      value: stats.emailSubscribers,
      icon: Mail,
      color: "purple"
    },
    {
      label: "WhatsApp",
      value: stats.whatsappSubscribers,
      icon: MessageCircle,
      color: "green"
    }
  ];

  const colorMap = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
    green: { bg: "bg-green-100", text: "text-green-600" }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorMap[card.color];
        return (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-slate-500">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}