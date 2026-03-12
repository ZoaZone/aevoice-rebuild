import Layout from "./Layout.jsx";

import APIIntegration from "./APIIntegration";

import AddFreePartner from "./AddFreePartner";

import AdminCallLogs from "./AdminCallLogs";

import AdminDashboard from "./AdminDashboard";

import AffiliatePortal from "./AffiliatePortal";

import AgencyPortal from "./AgencyPortal";

import AgencySignup from "./AgencySignup";

import AgentBuilder from "./AgentBuilder";

import AgentTrainingDashboard from "./AgentTrainingDashboard";

import Agents from "./Agents";

import Analytics from "./Analytics";

import Billing from "./Billing";

import CallHistory from "./CallHistory";

import CreditManagement from "./CreditManagement";

import Dashboard from "./Dashboard";

import EmbedWidget from "./EmbedWidget";

import FeatureSelection from "./FeatureSelection";

import HelloBizOnboarding from "./HelloBizOnboarding";

import HelpCenter from "./HelpCenter";

import Home from "./Home";

import IndustryTemplates from "./IndustryTemplates";

import InstallationService from "./InstallationService";

import InstallationStatus from "./InstallationStatus";

import Knowledge from "./Knowledge";

import MarketingHub from "./MarketingHub";

import PhoneNumbers from "./PhoneNumbers";

import PostPaymentOnboarding from "./PostPaymentOnboarding";

import Pricing from "./Pricing";

import PromoManagement from "./PromoManagement";

import PromoSignup from "./PromoSignup";

import Settings from "./Settings";

import TechnicalArchitecture from "./TechnicalArchitecture";

import VoiceChatbotPlans from "./VoiceChatbotPlans";

import WebhookDocs from "./WebhookDocs";

import WidgetAnalyticsDashboard from "./WidgetAnalyticsDashboard";

import WidgetBuilder from "./WidgetBuilder";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    APIIntegration: APIIntegration,
    
    AddFreePartner: AddFreePartner,
    
    AdminCallLogs: AdminCallLogs,
    
    AdminDashboard: AdminDashboard,
    
    AffiliatePortal: AffiliatePortal,
    
    AgencyPortal: AgencyPortal,
    
    AgencySignup: AgencySignup,
    
    AgentBuilder: AgentBuilder,
    
    AgentTrainingDashboard: AgentTrainingDashboard,
    
    Agents: Agents,
    
    Analytics: Analytics,
    
    Billing: Billing,
    
    CallHistory: CallHistory,
    
    CreditManagement: CreditManagement,
    
    Dashboard: Dashboard,
    
    EmbedWidget: EmbedWidget,
    
    FeatureSelection: FeatureSelection,
    
    HelloBizOnboarding: HelloBizOnboarding,
    
    HelpCenter: HelpCenter,
    
    Home: Home,
    
    IndustryTemplates: IndustryTemplates,
    
    InstallationService: InstallationService,
    
    InstallationStatus: InstallationStatus,
    
    Knowledge: Knowledge,
    
    MarketingHub: MarketingHub,
    
    PhoneNumbers: PhoneNumbers,
    
    PostPaymentOnboarding: PostPaymentOnboarding,
    
    Pricing: Pricing,
    
    PromoManagement: PromoManagement,
    
    PromoSignup: PromoSignup,
    
    Settings: Settings,
    
    TechnicalArchitecture: TechnicalArchitecture,
    
    VoiceChatbotPlans: VoiceChatbotPlans,
    
    WebhookDocs: WebhookDocs,
    
    WidgetAnalyticsDashboard: WidgetAnalyticsDashboard,
    
    WidgetBuilder: WidgetBuilder,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<APIIntegration />} />
                
                
                <Route path="/APIIntegration" element={<APIIntegration />} />
                
                <Route path="/AddFreePartner" element={<AddFreePartner />} />
                
                <Route path="/AdminCallLogs" element={<AdminCallLogs />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/AffiliatePortal" element={<AffiliatePortal />} />
                
                <Route path="/AgencyPortal" element={<AgencyPortal />} />
                
                <Route path="/AgencySignup" element={<AgencySignup />} />
                
                <Route path="/AgentBuilder" element={<AgentBuilder />} />
                
                <Route path="/AgentTrainingDashboard" element={<AgentTrainingDashboard />} />
                
                <Route path="/Agents" element={<Agents />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/Billing" element={<Billing />} />
                
                <Route path="/CallHistory" element={<CallHistory />} />
                
                <Route path="/CreditManagement" element={<CreditManagement />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/EmbedWidget" element={<EmbedWidget />} />
                
                <Route path="/FeatureSelection" element={<FeatureSelection />} />
                
                <Route path="/HelloBizOnboarding" element={<HelloBizOnboarding />} />
                
                <Route path="/HelpCenter" element={<HelpCenter />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/IndustryTemplates" element={<IndustryTemplates />} />
                
                <Route path="/InstallationService" element={<InstallationService />} />
                
                <Route path="/InstallationStatus" element={<InstallationStatus />} />
                
                <Route path="/Knowledge" element={<Knowledge />} />
                
                <Route path="/MarketingHub" element={<MarketingHub />} />
                
                <Route path="/PhoneNumbers" element={<PhoneNumbers />} />
                
                <Route path="/PostPaymentOnboarding" element={<PostPaymentOnboarding />} />
                
                <Route path="/Pricing" element={<Pricing />} />
                
                <Route path="/PromoManagement" element={<PromoManagement />} />
                
                <Route path="/PromoSignup" element={<PromoSignup />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/TechnicalArchitecture" element={<TechnicalArchitecture />} />
                
                <Route path="/VoiceChatbotPlans" element={<VoiceChatbotPlans />} />
                
                <Route path="/WebhookDocs" element={<WebhookDocs />} />
                
                <Route path="/WidgetAnalyticsDashboard" element={<WidgetAnalyticsDashboard />} />
                
                <Route path="/WidgetBuilder" element={<WidgetBuilder />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}