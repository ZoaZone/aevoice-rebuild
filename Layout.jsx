import { useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { NavigationStackProvider, useNavigationStack } from "@/components/navigation/NavigationStack";
import { isAevathonHost } from "@/utils/hostname";

import SreeUnifiedWidget from "@/components/sree/SreeUnifiedWidget.jsx";
import SreeProviderStack from "@/components/sree/SreeProviderStack.jsx";
import SreeMiniMonitor from "@/components/sree/SreeMiniMonitor.jsx";
import SiteChatWidget from "@/components/chatbot/SiteChatWidget.jsx";

import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import DesktopErrorBoundary from "@/components/desktop/DesktopErrorBoundary";
import Overlay from "@/components/desktop/Overlay";
import Watchdog from "@/components/desktop/Watchdog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Moon, Sun, LayoutDashboard, Bot, Phone, BookOpen, BarChart3, Settings as SettingsIcon, Headphones, CreditCard, Radio, UserCircle, Loader2, Bell, History, ChevronLeft } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// PUBLIC PAGE NAMES — FINAL CANONICAL LIST
// These pages render WITHOUT login, sidebar, or auth queries.
// Every page NOT in this set gets the authenticated DashboardShell.
// ═══════════════════════════════════════════════════════════════
const PUBLIC_PAGE_NAMES = new Set([
  // Landing & marketing
  "Home",
  "Pricing",
  "HelloBizPricing",
  "VoiceChatbotPlans",
  "FeatureSelection",
  "VoiceBotIntegration",
  "AutomationArchitecture",
  "CrossPlatformIntegration",
  "TechnicalArchitecture",
  // Signup & onboarding
  "AgencySignup",
  "AgencyPortal",
  "AffiliatePortal",
  "HelloBizOnboarding",
  "Onboarding",
  "PostPaymentOnboarding",
  "FreePartnerSignup",
  "PromoSignup",
  "FreePartnerWhitelist",
  "AddFreePartner",
  "PromoManagement",
  // Embeds, demos, widget hosts
  "WidgetHost",
  "SreeDemo",
  "EmbedWidget",
  // Docs / legal / support
  "HelpCenter",
  "Downloads",
  "WebhookDocs",
  "APIIntegration",
  "IndustryTemplates",
  "InstallationService",
  "InstallationStatus",
]);

export default function Layout({ children, currentPageName }) {
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();

  const pathname = location.pathname.toLowerCase();
  const isLandingPage =
    currentPageName === "Home" &&
    (pathname === "/" || pathname === "/home" || pathname.startsWith("/home?"));
  const isPublicPage = isLandingPage || PUBLIC_PAGE_NAMES.has(currentPageName);

  // Safety guard: page name not resolved yet
  if (!currentPageName) {
    return (
      <HelmetProvider>
        <div className="min-h-screen">{children}</div>
      </HelmetProvider>
    );
  }

  // Public pages: clean wrapper, zero dashboard code
  if (isPublicPage) {
    return (
      <HelmetProvider>
        <div className="min-h-screen">{children}</div>
        {currentPageName === "Home" && <SiteChatWidget />}
      </HelmetProvider>
    );
  }

  // Dashboard pages: authenticated layout with navigation stack
  return (
    <NavigationStackProvider>
      <DashboardShell darkMode={darkMode} setDarkMode={setDarkMode} currentPageName={currentPageName} locationKey={location.key}>
        {children}
      </DashboardShell>
    </NavigationStackProvider>
  );
}

// ═══════════════════════════════════════════════════════════════
// DashboardShell — only mounted for authenticated product pages.
// Waits for user + client resolution before rendering content,
// preventing hydration flicker on login/dashboard transition.
// ═══════════════════════════════════════════════════════════════
function DashboardShell({ children, darkMode, setDarkMode, currentPageName, locationKey }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const queryClient = useQueryClient();

  const isAevathon = typeof window !== "undefined" && (isAevathonHost?.() || false);
  const isDesktopApp =
    typeof window !== "undefined" &&
    (window.__TAURI__ || window.electron || window.process?.type === "renderer");
  const isClient = typeof window !== "undefined";

  // ─── Auth: fetch current user ───
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 60_000,
  });

  // ─── Client resolution: getMyClient auto-creates if needed ───
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["myClient", user?.email],
    queryFn: async () => {
      const res = await base44.functions.invoke("getMyClient", {});
      return res.data?.client || null;
    },
    enabled: !!user?.email,
    staleTime: 120_000,
    retry: 2,
  });

  // ─── Brand agency (must be called before any early return to keep hook order stable) ───
  const { data: agencies } = useQuery({
    queryKey: ["brandAgency"],
    queryFn: () => base44.entities.Agency.list(),
    staleTime: 300_000,
  });

  const DEFAULT_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG";
  const brandLogo = agencies?.[0]?.logo_url || DEFAULT_LOGO;

  const clientResolved = !userLoading && (!user?.email || !clientLoading);

  const userRole = user?.role || "user";
  const isAgencyApproved = !!user?.isAgencyApproved;
  const isAgencyRole =
    userRole === "admin" ||
    userRole === "agency_owner" ||
    userRole === "agency_manager" ||
    isAgencyApproved;

  const navStack = useNavigationStack();

  // Root pages that appear in mobile bottom nav
  const ROOT_PAGES = new Set(["Dashboard", "Agents", "Knowledge", "CallHistory"]);
  
  // Update navigation stack when page changes (MUST BE BEFORE EARLY RETURNS)
  useEffect(() => {
    const path = location.pathname;
    const rootPage = Array.from(ROOT_PAGES).find(page => currentPageName === page);
    
    if (rootPage) {
      const scrollElement = document.getElementById("main-scroll-area");
      const scrollY = scrollElement?.scrollTop || 0;
      navStack.pushToStack(rootPage, path, scrollY);
    }
  }, [location.pathname, currentPageName, navStack]);

  // ─── HYDRATION GUARD: Block dashboard until user + client_id are fully resolved ───
  if (userLoading || (user?.email && clientLoading)) {
    return (
      <HelmetProvider>
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </HelmetProvider>
    );
  }

  // ─── Sidebar navigation items ───
  const coreAiItems = isAevathon ? [
    { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { label: "AI Agents", page: "Agents", icon: Bot },
    { label: "Knowledge Base", page: "Knowledge", icon: BookOpen },
    { label: "Widget Builder", page: "WidgetBuilder", icon: SettingsIcon },
  ] : [
    { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { label: "AI Agents", page: "Agents", icon: Bot },
    { label: "Channels", page: "Channels", icon: Radio },
    { label: "Phone Numbers", page: "PhoneNumbers", icon: Phone },
    { label: "Knowledge Base", page: "Knowledge", icon: BookOpen },
    { label: "Widget Builder", page: "WidgetBuilder", icon: SettingsIcon },
    { label: "Agent Training", page: "AgentTrainingDashboard", icon: BookOpen },
    { label: "CRM", page: "CRM", icon: UserCircle },
    { label: "Agent Assistant", page: "AgentAssistant", icon: Bot },
    { label: "Integrations", page: "Integrations", icon: SettingsIcon },
    { label: "FlowSync", page: "FlowSync", icon: BarChart3 },
    { label: "Workflow Builder", page: "AIWorkflowBuilder", icon: SettingsIcon },
  ];

  const marketingItems = isAevathon ? [] : [
    { label: "Marketing Hub", page: "MarketingHub", icon: BarChart3 },
    { label: "Call Analytics", page: "Analytics", icon: BarChart3 },
    { label: "Call History", page: "CallHistory", icon: BarChart3 },
  ];

  const supportItems = [
    { label: "Notifications", page: "Notifications", icon: Bell },
    { label: "Help Center", page: "HelpCenter", icon: Headphones },
  ];

  const agencyItems = (!isAevathon && isAgencyRole)
    ? [
        { label: "Billing", page: "Billing", icon: CreditCard },
        { label: "Settings", page: "Settings", icon: SettingsIcon },
        ...(userRole === "admin" ? [{ label: "Admin Dashboard", page: "AdminDashboard", icon: SettingsIcon }] : []),
      ]
    : [];

  const footerLinks = [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Contact", href: "/contact" },
    { label: "Status", href: "/status" },
  ];

  // Show back button on sub-pages (not root pages)
  const showBackButton = !ROOT_PAGES.has(currentPageName) && currentPageName !== "Home";
  
  // Track navigation depth to prevent accidental exits
  const navigationDepth = navStack.getNavigationDepth(currentPageName);

  // Bottom nav items for mobile
  const MOBILE_NAV_ITEMS = [
    { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { label: "Agents", page: "Agents", icon: Bot },
    { label: "Knowledge", page: "Knowledge", icon: BookOpen },
    { label: "History", page: "CallHistory", icon: History },
  ];

  // Stable route key for animation — only root pages use page name as key
  const animKey = ROOT_PAGES.has(currentPageName) ? currentPageName : locationKey;

  const NavLink = ({ item }) => {
    const url = createPageUrl(item.page);
    const isActive = currentPageName === item.page || currentPath === url;
    return (
      <li>
        <Link
          to={url}
          className={cn(
            "flex items-center px-2 py-1.5 rounded hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors",
            isActive && "bg-indigo-100 dark:bg-slate-800 font-medium"
          )}
        >
          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
          <span>{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <div className={cn(
          "flex min-h-screen bg-white dark:bg-slate-950",
          darkMode && "dark"
        )}>
          {/* ── Sidebar ── */}
          <aside className={cn(
            "hidden md:flex w-64 border-r flex-col shrink-0",
            isAevathon
              ? "border-purple-200 bg-gradient-to-b from-white via-purple-50 to-indigo-100 dark:bg-slate-900 dark:border-slate-800"
              : "border-slate-200 bg-gradient-to-b from-white via-indigo-50 to-indigo-100 dark:bg-slate-900 dark:border-slate-800"
          )}>
            <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              {isAevathon ? (
                <>
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Aevathon</div>
                    <div className="text-xs text-purple-600">Voice Assistant Builder</div>
                  </div>
                </>
              ) : (
                <>
                  <img src={brandLogo || DEFAULT_LOGO} alt="AEVOICE" className="h-8 w-auto rounded-sm shadow" />
                  <div>
                    <div className="text-lg font-semibold">AEVOICE</div>
                    <div className="text-xs text-indigo-600">Your AI Voice Assistant</div>
                  </div>
                </>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-sm">
              <div>
                <div className={cn("px-2 mb-2 text-xs font-semibold uppercase", isAevathon ? "text-purple-600" : "text-indigo-600")}>
                  {isAevathon ? "Assistant Builder" : "Core AI"}
                </div>
                <ul className="space-y-1">
                  {coreAiItems.map((item) => <NavLink key={item.page} item={item} />)}
                </ul>
              </div>

              {marketingItems.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-xs font-semibold uppercase text-indigo-600">Marketing & Insights</div>
                  <ul className="space-y-1">
                    {marketingItems.map((item) => <NavLink key={item.page} item={item} />)}
                  </ul>
                </div>
              )}

              {agencyItems.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-xs font-semibold uppercase text-indigo-600">Account</div>
                  <ul className="space-y-1">
                    {agencyItems.map((item) => <NavLink key={item.page} item={item} />)}
                  </ul>
                </div>
              )}

              <div>
                <div className="px-2 mb-2 text-xs font-semibold uppercase text-indigo-600">Support</div>
                <ul className="space-y-1">
                  {supportItems.map((item) => <NavLink key={item.page} item={item} />)}
                </ul>
              </div>
            </nav>

            <footer className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 space-y-1 bg-gradient-to-r from-indigo-50 to-sky-50">
              <div className="flex flex-wrap items-center gap-2">
                {footerLinks.map((link) => (
                  <a key={link.href} href={link.href} className="hover:underline">{link.label}</a>
                ))}
                <button
                  onClick={() => window.dispatchEvent(new Event("pwa:show"))}
                  className="ml-auto px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Install App
                </button>
              </div>
              <div className="text-[11px] text-slate-400">&copy; {isAevathon ? "Aevathon" : "AEVOICE"} {new Date().getFullYear()} &bull; v1.0.0</div>
            </footer>
          </aside>

          {/* ── Main column ── */}
          <div className="flex flex-col flex-1 min-w-0">
            <header
              className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60 flex items-center justify-between px-4 shrink-0"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)", paddingLeft: "max(env(safe-area-inset-left, 0px), 1rem)", paddingRight: "max(env(safe-area-inset-right, 0px), 1rem)", minHeight: 56 }}
            >
              <div className="flex items-center gap-2">
                {/* Back button for non-root pages */}
                {showBackButton && (
                  <button
                    onClick={() => window.history.back()}
                    className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                )}
                <span className="text-sm font-medium text-slate-700">{currentPageName || "Dashboard"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link to={createPageUrl(isAevathon ? "SreeDemo" : "AgentBuilder")}>
                  <Button size="sm" className={cn("h-9 text-white hidden sm:inline-flex", isAevathon ? "bg-purple-600 hover:bg-purple-700" : "bg-indigo-600 hover:bg-indigo-700")}>
                    {isAevathon ? "New Assistant" : "New Agent"}
                  </Button>
                </Link>
                <NotificationBell />
                <AdminNotificationBell />
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDarkMode(v => !v)}>
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <span className="mr-2 hidden sm:inline">{user?.full_name || "Guest"}</span>
                      <span className="text-xs text-slate-500 hidden sm:inline">{user?.email || ""}</span>
                      <UserCircle className="h-4 w-4 sm:hidden" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("Settings")}>Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      queryClient.cancelQueries();
                      queryClient.clear();
                      base44.auth.logout("/");
                    }}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto pb-20 md:pb-6" style={{ paddingBottom: `max(env(safe-area-inset-bottom, 0px), 5rem)` }} id="main-scroll-area">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={animKey}
                  initial={{ x: 24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -24, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="p-4 md:p-6 min-h-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* ── Mobile bottom navigation ── */}
            <nav
              className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/60 dark:border-slate-800/60 flex items-stretch z-50"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)", paddingLeft: "max(env(safe-area-inset-left, 0px), 0px)", paddingRight: "max(env(safe-area-inset-right, 0px), 0px)" }}
            >
              {MOBILE_NAV_ITEMS.map((item) => {
                const isActive = currentPageName === item.page;
                const url = createPageUrl(item.page);
                return (
                  <button
                    key={item.page}
                    onClick={() => {
                      if (isActive) {
                        // Re-tap: reset navigation stack and scroll to top
                        navStack.resetStack(item.page);
                        const scrollElement = document.getElementById("main-scroll-area");
                        if (scrollElement) {
                          scrollElement.scrollTo({ top: 0, behavior: "smooth" });
                        }
                        navigate(url, { replace: true });
                      } else {
                        // Switching tabs: preserve their stack
                        navigate(url);
                      }
                    }}
                    aria-label={item.label}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[56px]",
                      isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {isClient && (
            <SreeProviderStack>
              <SreeUnifiedWidget
                key="global-sree-widget-20260201-2"
                className="sree-widget"
                draggable={true}
                demoMode={false}
                style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}
              />
              <SreeMiniMonitor enabled={true} />
            </SreeProviderStack>
          )}

          <PWAInstallPrompt />
          {isDesktopApp && (
            <DesktopErrorBoundary>
              <Overlay />
            </DesktopErrorBoundary>
          )}
          {isDesktopApp && <Watchdog />}
        </div>
      </ErrorBoundary>
    </HelmetProvider>
  );
}