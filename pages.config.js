/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIWorkflowBuilder from './pages/AIWorkflowBuilder';
import APIIntegration from './pages/APIIntegration';
import AddFreePartner from './pages/AddFreePartner';
import AdminApprovals from './pages/AdminApprovals';
import AdminCallLogs from './pages/AdminCallLogs';
import AdminDashboard from './pages/AdminDashboard';
import AffiliatePortal from './pages/AffiliatePortal';
import AgencyPortal from './pages/AgencyPortal';
import AgencySignup from './pages/AgencySignup';
import AgentAssistant from './pages/AgentAssistant';
import AgentBuilder from './pages/AgentBuilder';
import AgentTest from './pages/AgentTest';
import AgentTrainingDashboard from './pages/AgentTrainingDashboard';
import Agents from './pages/Agents';
import Analytics from './pages/Analytics';
import Billing from './pages/Billing';
import CRM from './pages/CRM';
import CRMDashboard from './pages/CRMDashboard';
import CallHistory from './pages/CallHistory';
import Channels from './pages/Channels';
import CreditManagement from './pages/CreditManagement';
import Dashboard from './pages/Dashboard';
import Downloads from './pages/Downloads';
import EmbedWidget from './pages/EmbedWidget';
import FeatureSelection from './pages/FeatureSelection';
import FlowSync from './pages/FlowSync';
import FreePartnerSignup from './pages/FreePartnerSignup';
import FreePartnerWhitelist from './pages/FreePartnerWhitelist';
import HelloBizDashboard from './pages/HelloBizDashboard';
import HelloBizOnboarding from './pages/HelloBizOnboarding';
import HelloBizPricing from './pages/HelloBizPricing';
import HelpCenter from './pages/HelpCenter';
import Home from './pages/Home';
import IndustryTemplates from './pages/IndustryTemplates';
import InstallationService from './pages/InstallationService';
import InstallationStatus from './pages/InstallationStatus';
import Integrations from './pages/Integrations';
import IntegrationsHub from './pages/IntegrationsHub';
import JobsMonitor from './pages/JobsMonitor';
import Knowledge from './pages/Knowledge';
import MarketingHub from './pages/MarketingHub';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import PhoneNumbers from './pages/PhoneNumbers';
import PostPaymentOnboarding from './pages/PostPaymentOnboarding';
import Pricing from './pages/Pricing';
import PromoManagement from './pages/PromoManagement';
import PromoSignup from './pages/PromoSignup';
import Settings from './pages/Settings';
import SreeAgentic from './pages/SreeAgentic';
import SreeConfig from './pages/SreeConfig';
import SreeDemo from './pages/SreeDemo';
import SreeDeveloper from './pages/SreeDeveloper';
import TechnicalArchitecture from './pages/TechnicalArchitecture';
import TelephonyProviders from './pages/TelephonyProviders';
import VoiceChatbotPlans from './pages/VoiceChatbotPlans';
import WebhookDocs from './pages/WebhookDocs';
import WidgetAnalyticsDashboard from './pages/WidgetAnalyticsDashboard';
import WidgetBuilder from './pages/WidgetBuilder';
import WidgetHost from './pages/WidgetHost';
import WidgetSettings from './pages/WidgetSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIWorkflowBuilder": AIWorkflowBuilder,
    "APIIntegration": APIIntegration,
    "AddFreePartner": AddFreePartner,
    "AdminApprovals": AdminApprovals,
    "AdminCallLogs": AdminCallLogs,
    "AdminDashboard": AdminDashboard,
    "AffiliatePortal": AffiliatePortal,
    "AgencyPortal": AgencyPortal,
    "AgencySignup": AgencySignup,
    "AgentAssistant": AgentAssistant,
    "AgentBuilder": AgentBuilder,
    "AgentTest": AgentTest,
    "AgentTrainingDashboard": AgentTrainingDashboard,
    "Agents": Agents,
    "Analytics": Analytics,
    "Billing": Billing,
    "CRM": CRM,
    "CRMDashboard": CRMDashboard,
    "CallHistory": CallHistory,
    "Channels": Channels,
    "CreditManagement": CreditManagement,
    "Dashboard": Dashboard,
    "Downloads": Downloads,
    "EmbedWidget": EmbedWidget,
    "FeatureSelection": FeatureSelection,
    "FlowSync": FlowSync,
    "FreePartnerSignup": FreePartnerSignup,
    "FreePartnerWhitelist": FreePartnerWhitelist,
    "HelloBizDashboard": HelloBizDashboard,
    "HelloBizOnboarding": HelloBizOnboarding,
    "HelloBizPricing": HelloBizPricing,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "IndustryTemplates": IndustryTemplates,
    "InstallationService": InstallationService,
    "InstallationStatus": InstallationStatus,
    "Integrations": Integrations,
    "IntegrationsHub": IntegrationsHub,
    "JobsMonitor": JobsMonitor,
    "Knowledge": Knowledge,
    "MarketingHub": MarketingHub,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "PhoneNumbers": PhoneNumbers,
    "PostPaymentOnboarding": PostPaymentOnboarding,
    "Pricing": Pricing,
    "PromoManagement": PromoManagement,
    "PromoSignup": PromoSignup,
    "Settings": Settings,
    "SreeAgentic": SreeAgentic,
    "SreeConfig": SreeConfig,
    "SreeDemo": SreeDemo,
    "SreeDeveloper": SreeDeveloper,
    "TechnicalArchitecture": TechnicalArchitecture,
    "TelephonyProviders": TelephonyProviders,
    "VoiceChatbotPlans": VoiceChatbotPlans,
    "WebhookDocs": WebhookDocs,
    "WidgetAnalyticsDashboard": WidgetAnalyticsDashboard,
    "WidgetBuilder": WidgetBuilder,
    "WidgetHost": WidgetHost,
    "WidgetSettings": WidgetSettings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};