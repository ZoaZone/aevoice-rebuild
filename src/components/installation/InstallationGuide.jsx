import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Video, Code } from "lucide-react";

export default function InstallationGuide() {
  const guides = [
    {
      title: "Getting Started with AEVOICE",
      description: "Complete guide to setting up your first AI voice agent",
      type: "PDF",
      icon: FileText,
      color: "from-blue-500 to-cyan-500",
      url: "#",
      pages: "24 pages"
    },
    {
      title: "Agent Training Best Practices",
      description: "How to train your AI agent for optimal performance",
      type: "PDF",
      icon: FileText,
      color: "from-purple-500 to-pink-500",
      url: "#",
      pages: "18 pages"
    },
    {
      title: "Website Chatbot Integration",
      description: "Step-by-step guide to embedding Sri on your website",
      type: "PDF",
      icon: Code,
      color: "from-emerald-500 to-teal-500",
      url: "#",
      pages: "12 pages"
    },
    {
      title: "Phone System Setup",
      description: "Connect Twilio and configure your phone numbers",
      type: "PDF",
      icon: FileText,
      color: "from-amber-500 to-orange-500",
      url: "#",
      pages: "16 pages"
    },
    {
      title: "Video Tutorial: Creating Your First Agent",
      description: "Watch how to build and deploy an AI agent in 10 minutes",
      type: "Video",
      icon: Video,
      color: "from-indigo-500 to-purple-500",
      url: "#",
      pages: "10 min"
    },
    {
      title: "API Integration Guide",
      description: "Integrate AEVOICE with your existing systems",
      type: "PDF",
      icon: Code,
      color: "from-cyan-500 to-blue-500",
      url: "#",
      pages: "22 pages"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Documentation & Guides</h2>
        <p className="text-slate-600">Download comprehensive guides and tutorials</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {guides.map((guide, index) => {
          const Icon = guide.icon;
          return (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all group">
              <CardContent className="p-6">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${guide.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <Badge className="mb-3 bg-slate-100 text-slate-700">{guide.type}</Badge>
                <h3 className="font-semibold text-slate-900 mb-2">{guide.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{guide.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{guide.pages}</span>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-2 border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Need Custom Documentation?</h3>
              <p className="text-sm text-slate-600 mb-3">
                Contact our team for industry-specific guides, white-label documentation, or custom training materials.
              </p>
              <a href="mailto:care@aevoice.ai">
                <Button size="sm" className="bg-cyan-600">
                  Request Custom Docs
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}