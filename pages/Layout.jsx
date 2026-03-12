
import React, { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Phone,
  Bot,
  BookOpen,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Headphones,
  Zap,
  Moon,
  Sun,
  Code,
  Wrench,
  Globe,
  DollarSign,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import SriAssistant from "./components/assistant/SriAssistant";
import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";
import AdminNotificationBell from "./components/admin/AdminNotificationBell";

const navigation = [
  { name: "Dashboard", href: "Dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "Agents", icon: Bot },
  { name: "Industry Templates", href: "IndustryTemplates", icon: Zap },
  { name: "Agent Training", href: "AgentTrainingDashboard", icon: Brain },
  { name: "Website Widget", href: "EmbedWidget", icon: Globe },
  { name: "Phone Numbers", href: "PhoneNumbers", icon: Phone },
  { name: "Knowledge", href: "Knowledge", icon: BookOpen },
  { name: "Call History", href: "CallHistory", icon: Headphones },
  { name: "Analytics", href: "Analytics", icon: BarChart3 },
  { name: "Marketing Hub", href: "MarketingHub", icon: Zap },
  { name: "CRM Webhooks", href: "WebhookDocs", icon: Globe },
  { name: "Credit Management", href: "CreditManagement", icon: DollarSign },
  { name: "API Integration", href: "APIIntegration", icon: Code },
  { name: "Technical Docs", href: "TechnicalArchitecture", icon: Wrench },
  { name: "Billing", href: "Billing", icon: CreditCard },
  { name: "Settings", href: "Settings", icon: Settings },
  { name: "Help Center", href: "HelpCenter", icon: Users },
  { name: "Promo Management", href: "PromoManagement", icon: Zap, adminOnly: true },
  { name: "Call Logs", href: "AdminCallLogs", icon: Headphones, adminOnly: true },
  { name: "Admin", href: "AdminDashboard", icon: Settings, adminOnly: true },
  ];

const helloBizNavigation = [
  { name: "HelloBiz Marketplace", href: "https://hellobiz.app", icon: Globe, external: true },
  { name: "FlowSync Automation", href: "https://flow.hellobiz.app", icon: Zap, external: true },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (currentPageName === "Home" || currentPageName === "Pricing" || currentPageName === "AgencySignup" || currentPageName === "AgencyPortal" || currentPageName === "VoiceChatbotPlans" || currentPageName === "AffiliatePortal" || currentPageName === "FeatureSelection" || currentPageName === "VoiceBotIntegration" || currentPageName === "AutomationArchitecture" || currentPageName === "CrossPlatformIntegration" || currentPageName === "HelloBizOnboarding") {
    return <HelmetProvider>{children}</HelmetProvider>;
  }

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home")); // Pass the desired redirect URL directly
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <HelmetProvider>
    <ErrorBoundary>
    <div className={cn("min-h-screen bg-slate-50", darkMode && "dark bg-slate-950")}>
      <style>{`
        .sidebar-gradient {
          background: linear-gradient(180deg, #0a2540 0%, #0e4166 100%);
        }
      `}</style>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-72 sidebar-gradient text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/10 flex-shrink-0">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG" 
                alt="AEVOICE" 
                className="w-10 h-10 rounded-full object-cover"
              />
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/e41d7c8f7_IMG_5886.jpg" 
                alt="AEVOICE" 
                className="h-6 object-contain"
              />
            </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="px-3 py-4 space-y-1">
            {navigation.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') return null;
              const isActive = currentPageName === item.href;
              const isAdminItem = item.name === "Admin";

              return (
                <Link
                    key={item.name}
                    to={createPageUrl(item.href)}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-white border border-cyan-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                      isAdminItem && "border border-amber-500/30 bg-amber-500/5"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5",
                      isActive && "text-cyan-400",
                      isAdminItem && "text-amber-400"
                    )} />
                    {item.name}
                    {isAdminItem && (
                      <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </Link>
              );
            })}

            {/* HelloBiz Platform Links */}
            <div className="pt-4 mt-4 border-t border-white/10">
              <p className="px-4 text-xs text-slate-500 mb-2 uppercase tracking-wider">HelloBiz Ecosystem</p>
              {helloBizNavigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </a>
              ))}
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="w-9 h-9 border-2 border-cyan-500/30">
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-sky-600 text-white text-sm">
                {getInitials(user?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || "User"}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5 text-slate-600" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              <AdminNotificationBell />
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <Link to={createPageUrl("AgentBuilder")}>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white">
                      <Zap className="w-4 h-4 mr-2" />
                      New Agent
                    </Button>
                  </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <SriAssistant />
      <PWAInstallPrompt />
    </div>
    </ErrorBoundary>
    </HelmetProvider>
  );
}
