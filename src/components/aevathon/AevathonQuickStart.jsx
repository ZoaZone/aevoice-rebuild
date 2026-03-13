import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, BookOpen, Wrench, Puzzle } from "lucide-react";
import { isAevathonHost } from "@/components/utils/host";

export default function AevathonQuickStart() {
  if (!isAevathonHost()) return null;
  const tiles = [
    {
      title: "Onboarding",
      desc: "Set up your event workspace and policies.",
      page: "Onboarding",
      icon: Wrench,
      variant: "default",
    },
    {
      title: "Assistant Builder",
      desc: "Create your Aevathon agent and tools.",
      page: "AgentBuilder",
      icon: Bot,
      variant: "outline",
    },
    {
      title: "Knowledge Upload",
      desc: "Add docs, URLs, and files to train agents.",
      page: "Knowledge",
      icon: BookOpen,
      variant: "outline",
    },
    {
      title: "Widget Embed",
      desc: "Configure and embed the chat/voice widget.",
      page: "WidgetSettings",
      icon: Puzzle,
      variant: "outline",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {tiles.map((t) => (
        <Card key={t.title} className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-900/5">
                <t.icon className="w-5 h-5 text-slate-700" />
              </div>
              <CardTitle className="text-base">{t.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-slate-500 mb-4">{t.desc}</p>
            <Link to={createPageUrl(t.page)}>
              <Button variant={t.variant} size="sm">Open</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}