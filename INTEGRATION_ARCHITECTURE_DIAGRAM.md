# ENTERPRISE INTEGRATION ARCHITECTURE DIAGRAM

## Visual Overview

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    ENTERPRISE INTEGRATION ECOSYSTEM                         ║
║                                                                             ║
║  "Unified platform combining AI voice, marketplace, automation & billing"  ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                          END USER EXPERIENCE                                 │
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐│
│  │   Customer   │   │   Business   │   │   Partner/   │   │  Enterprise  ││
│  │   Portal     │   │    Owner     │   │   Reseller   │   │    Admin     ││
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘│
│         │                  │                   │                   │         │
│         └──────────────────┴───────────────────┴───────────────────┘         │
│                                      │                                       │
│                                      ▼                                       │
│                        ┌─────────────────────────────┐                      │
│                        │   UNIFIED SSO GATEWAY       │                      │
│                        │   (JWT-based Auth)          │                      │
│                        └─────────────────────────────┘                      │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                   ┌───────────────────┼───────────────────┐
                   │                   │                   │
                   ▼                   ▼                   ▼
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │   AEVOICE AI    │ │ HelloBiz Market │ │ Payroll/Billing │
         │   Platform      │ │    place        │ │    System       │
         └─────────────────┘ └─────────────────┘ └─────────────────┘

═══════════════════════════════════════════════════════════════════════════════

                              DETAILED ARCHITECTURE

╔═══════════════════════════════════════════════════════════════════════════╗
║                            1. AEVOICE AI PLATFORM                          ║
║                          (ai.hellobiz.app / aevoice.ai)                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────── Frontend Layer ──────────────────────────────┐
│                                                                             │
│  React Application (Vite + Base44 SDK)                                     │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│  │   Dashboard   │ │    Agents     │ │   FlowSync    │ │ HelloBiz      │ │
│  │   (Main UI)   │ │   Builder     │ │   Designer    │ │  Onboarding   │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│  │   Knowledge   │ │  Call History │ │    Widgets    │ │   Settings    │ │
│  │     Base      │ │   & Analytics │ │   & Embeds    │ │   & Billing   │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ API Calls (Base44 SDK)
                                      ▼
┌────────────────────────────── Backend Layer ────────────────────────────────┐
│                                                                              │
│  Deno Edge Functions (70+ TypeScript functions)                             │
│                                                                              │
│  ┌─────────────────────────── Core Functions ──────────────────────────┐   │
│  │                                                                      │   │
│  │  Agent Management:                                                   │   │
│  │  • createAgent.ts           • updateAgent.ts                         │   │
│  │  • deleteAgent.ts           • agentPermissions.ts                    │   │
│  │                                                                      │   │
│  │  Telephony:                                                          │   │
│  │  • twilioWebhook.ts         • asteriskWebhook.ts                     │   │
│  │  • inboundWebhook.ts        • purchaseTwilioNumber.ts                │   │
│  │  • registerSipNumber.ts     • linkNumberToAgent.ts                   │   │
│  │                                                                      │   │
│  │  Knowledge Base:                                                     │   │
│  │  • knowledgeUnified.ts      • buildKnowledgeEmbeddings.ts            │   │
│  │  • autoLearnWebsite.ts      • learnFromConversations.ts              │   │
│  │                                                                      │   │
│  │  Payments:                                                           │   │
│  │  • stripeWebhook.ts         • stripeCheckout.ts                      │   │
│  │  • createCustomerPortal.ts  • validateSubscription.ts                │   │
│  │                                                                      │   │
│  │  Widgets:                                                            │   │
│  │  • widgetLoader.ts          • widgetRemoteControl.ts                 │   │
│  │  • captureWidgetLead.ts     • widgetSessionCreate.ts                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────── FlowSync Engine ───────────────────────────┐    │
│  │                                                                     │    │
│  │  flowSyncEngine.ts - Workflow Automation                           │    │
│  │                                                                     │    │
│  │  Triggers:                        Actions:                         │    │
│  │  • manual                         • send_email                     │    │
│  │  • webhook                        • send_sms                       │    │
│  │  • schedule (cron)                • ai_voice_call                  │    │
│  │  • lead_created                   • update_customer                │    │
│  │  • ai_call_completed              • book_appointment               │    │
│  │  • appointment_booked             • trigger_webhook                │    │
│  │  • payment_received               • delay/wait                     │    │
│  │  • form_submitted                 • ai_summary                     │    │
│  │  • customer_updated               • scrape_website                 │    │
│  │                                   • create_agent                    │    │
│  │                                                                     │    │
│  │  Features:                                                          │    │
│  │  • Sequential execution          • Error handling                  │    │
│  │  • Conditional logic             • Context passing                 │    │
│  │  • Execution history             • Retry mechanisms                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────── HelloBiz Integration ─────────────────────────┐  │
│  │                                                                       │  │
│  │  SSO Functions:                                                       │  │
│  │  • ssoValidateToken.ts      - Validate JWT from HelloBiz             │  │
│  │  • ssoCreateUser.ts         - Auto-provision users                   │  │
│  │                                                                       │  │
│  │  White Glove Service ($100):                                          │  │
│  │  • HelloBizOnboarding.jsx   - 7-step form (frontend)                 │  │
│  │  • processWhiteGloveOnboarding.ts - Email implementation team        │  │
│  │  • createHelloBizWhiteGloveCheckout.ts - Stripe payment              │  │
│  │  • helloBizWhiteGloveWebhook.ts - Payment confirmation               │  │
│  │  • processHelloBizAutomation.ts - 20-step automation:                │  │
│  │                                                                       │  │
│  │    Steps 1-12: Standard Setup                                         │  │
│  │    1. Initialize          7. Wallet (20 credits)                      │  │
│  │    2. Scrape website      8. Widget generation                        │  │
│  │    3. Create client       9. Testing                                  │  │
│  │    4. Knowledge base     10. Deployment                               │  │
│  │    5. Phone setup        11. Documentation                            │  │
│  │    6. Create agent       12. Email notification                       │  │
│  │                                                                       │  │
│  │    Steps 13-20: HelloBiz-Specific                                     │  │
│  │   13. FlowSync workflows  (⚠️ placeholder - needs templates)          │  │
│  │   14. CRM integration     (✓ functional)                              │  │
│  │   15. Calendar integration (⚠️ placeholder - needs OAuth)             │  │
│  │   16. HelloBiz profile    (⚠️ placeholder)                            │  │
│  │   17. SSO configuration   (⚠️ placeholder - needs credentials)        │  │
│  │   18. Unified knowledge   (⚠️ placeholder)                            │  │
│  │   19. Integration tests   (⚠️ placeholder)                            │  │
│  │   20. Setup complete      (✓ functional with email)                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Database Operations
                                      ▼
┌────────────────────────────── Data Layer ───────────────────────────────────┐
│                                                                              │
│  Base44 Platform Database (Multi-tenant PostgreSQL)                         │
│                                                                              │
│  Core Entities:                                                              │
│  • Agency          • Client         • Agent          • User                  │
│  • KnowledgeBase   • KnowledgeChunk • PhoneNumber    • CallSession           │
│  • Widget          • Lead           • Customer       • Appointment           │
│  • Wallet          • CreditLedger   • Transaction    • Invoice               │
│  • FlowSyncWorkflow • AutomationRun • IntegrationConfig                      │
│  • InstallationService • SSOConfig  • CalendarIntegration                    │
│  • CommunicationUsage • AdminNotification                                    │
│                                                                              │
│  Data Relationships:                                                         │
│  Agency → Client → Agent → KnowledgeBase → Conversations                     │
│  Client → Wallet → Transactions → Billing                                    │
│  Client → FlowSyncWorkflow → Executions → Logs                               │
└──────────────────────────────────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                       2. HELLOBIZ MARKETPLACE                              ║
║                           (hellobiz.app)                                   ║
║                                                                            ║
║  ASSUMPTION: External System - Not in this repository                     ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────── Components ───────────────────────────────────┐
│                                                                              │
│  Public Marketplace:                                                         │
│  • Service directory (search, browse, filter)                                │
│  • Business profiles & listings                                              │
│  • Reviews & ratings                                                         │
│  • Lead capture forms                                                        │
│  • Booking requests                                                          │
│                                                                              │
│  Business Dashboard:                                                         │
│  • Service management                                                        │
│  • Lead notifications                                                        │
│  • Analytics & insights                                                      │
│  • Profile customization                                                     │
│                                                                              │
│  API Endpoints (Required for Integration):                                   │
│  POST /api/auth/generate-token          - Generate SSO JWT for AEVOICE      │
│  POST /api/listings/update              - Update business listing           │
│  POST /api/leads/forward                - Forward lead to AEVOICE           │
│  GET  /api/analytics/service/{id}       - Get service view stats            │
│  POST /webhook/aevoice                  - Receive events from AEVOICE       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │
                          ┌───────────┴───────────┐
                          │   Integration APIs    │
                          └───────────────────────┘
                          │                       │
                    ┌─────▼──────┐         ┌─────▼──────┐
                    │ SSO Token  │         │  Webhooks  │
                    │   Flow     │         │   Events   │
                    └────────────┘         └────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                    3. PAYROLL/BILLING/ACCOUNTING SYSTEM                    ║
║                          (pay.hellobiz.app)                                ║
║                                                                            ║
║  ASSUMPTION: Separate Repository - Not Connected Yet                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────── Components ───────────────────────────────────┐
│                                                                              │
│  Payroll Management:                                                         │
│  • Employee/contractor database                                              │
│  • Timesheet tracking                                                        │
│  • Salary calculations                                                       │
│  • Direct deposit processing                                                 │
│  • Tax withholding & filing (1099, W2)                                       │
│                                                                              │
│  Billing & Invoicing:                                                        │
│  • Invoice generation                                                        │
│  • Payment tracking                                                          │
│  • Recurring billing automation                                              │
│  • Multi-entity support                                                      │
│  • Custom invoice templates                                                  │
│                                                                              │
│  Accounting:                                                                 │
│  • Chart of accounts                                                         │
│  • Expense management                                                        │
│  • Financial reporting                                                       │
│  • Tax compliance                                                            │
│  • Integration with QuickBooks, Xero                                         │
│                                                                              │
│  API Endpoints (TO BE IMPLEMENTED):                                          │
│  POST /api/invoices                     - Create invoice from AEVOICE usage │
│  POST /api/usage-sync                   - Receive daily usage data          │
│  POST /api/reports/generate             - Generate financial reports        │
│  GET  /api/clients/{id}/balance         - Get client account balance        │
│  POST /webhook/aevoice                  - Receive payment events            │
│                                                                              │
│  Required Environment Variables:                                             │
│  • PAYROLL_API_KEY                      - Authentication key                │
│  • PAYROLL_WEBHOOK_SECRET               - Webhook signature verification    │
│  • AEVOICE_CLIENT_ID                    - AEVOICE system identifier         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════

                            INTEGRATION DATA FLOWS

╔═══════════════════════════════════════════════════════════════════════════╗
║                    FLOW 1: SSO AUTHENTICATION                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

User logs in to HelloBiz Marketplace
         │
         ▼
HelloBiz generates JWT token (contains: email, name, unified_user_id)
         │
         ▼
User clicks "Access AI Voice Agent" → Redirects to AEVOICE with token
         │
         ▼
AEVOICE ssoValidateToken.ts
         │
         ├─ Verify JWT signature (HELLOBIZ_JWT_SECRET)
         ├─ Extract user data from payload
         └─ Check if user exists in AEVOICE
                  │
                  ├─ User exists → Return session token
                  │
                  └─ New user → ssoCreateUser.ts
                                   │
                                   ├─ Create Client under HelloBiz agency
                                   ├─ Create Wallet (0 credits initially)
                                   └─ Send welcome email with AEVOICE login link


╔═══════════════════════════════════════════════════════════════════════════╗
║              FLOW 2: WHITE GLOVE SERVICE PROVISIONING                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

User clicks "White Glove Setup" in HelloBiz or AEVOICE
         │
         ▼
HelloBizOnboarding.jsx - 7-Step Form
  Step 1: Business Information (name, contact, logo, branding)
  Step 2: Knowledge Base (upload documents, URLs to scrape)
  Step 3: CRM & Calendar Integration (credentials, preferences)
  Step 4: Current Platforms (email, e-commerce, communication tools)
  Step 5: Voice Configuration (gender, accent, greeting, scripts)
  Step 6: HelloBiz Services (categories, pricing, service areas)
  Step 7: Review & Preferences (contact method, timeline)
         │
         ▼
Submit Form → createHelloBizWhiteGloveCheckout.ts
         │
         ├─ Create InstallationService record (status: pending_payment)
         ├─ Create Stripe checkout session ($100)
         └─ Redirect user to Stripe payment page
                  │
                  ▼
User completes payment
         │
         ▼
Stripe webhook → helloBizWhiteGloveWebhook.ts
         │
         ├─ Verify webhook signature
         ├─ Update InstallationService (status: payment_received)
         └─ Trigger processHelloBizAutomation.ts (async)
                  │
                  ▼
20-Step Automated Provisioning:
  [Steps 1-12: Standard Setup]
  1. ✓ Initialize automation run
  2. ✓ Scrape website content (if provided)
  3. ✓ Create Client under HelloBiz agency
  4. ✓ Create Knowledge Base with website chunks
  5. ✓ Configure phone settings (metadata)
  6. ✓ Create AI Agent with custom prompt & voice
  7. ✓ Create Wallet with 20 credits
  8. ✓ Generate widget embed code
  9. ✓ Run basic tests
 10. ✓ Mark as deployed
 11. ✓ Generate documentation
 12. ✓ Send initial email notification
  
  [Steps 13-20: HelloBiz-Specific]
 13. ⚠️ FlowSync Workflows (placeholder - needs templates)
 14. ✓ CRM Integration (store config)
 15. ⚠️ Calendar Integration (placeholder - needs OAuth)
 16. ⚠️ HelloBiz Profile (placeholder)
 17. ⚠️ SSO Configuration (placeholder - needs credentials)
 18. ⚠️ Unified Knowledge Sync (placeholder)
 19. ⚠️ Integration Tests (placeholder)
 20. ✓ Send completion email with widget code & dashboard link
         │
         ▼
Implementation team receives comprehensive email
User receives confirmation email
Client dashboard accessible with agent ready to use


╔═══════════════════════════════════════════════════════════════════════════╗
║                 FLOW 3: LEAD GENERATION & FOLLOW-UP                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

Customer finds business on HelloBiz Marketplace
         │
         ▼
Customer submits contact form or booking request
         │
         ▼
HelloBiz captures lead → POST /api/leads/forward (to AEVOICE)
         │
         ▼
AEVOICE receives webhook → Create Lead entity
         │
         ├─ Store lead data (name, email, phone, message)
         ├─ Link to client_id (based on unified_user_id)
         └─ Trigger FlowSync event: lead_created
                  │
                  ▼
FlowSync finds active workflows listening to lead_created
         │
         ▼
Execute workflow (example: "New Lead Follow-up")
  Step 1: Send email confirmation to lead
  Step 2: Send SMS notification to business owner
  Step 3: Wait 2 hours
  Step 4: Initiate AI voice call to lead
  Step 5: If call successful → Update CRM status to "contacted"
  Step 6: If no answer → Schedule retry in 24 hours
         │
         ▼
Lead status updated in AEVOICE CRM
Business owner notified via dashboard


╔═══════════════════════════════════════════════════════════════════════════╗
║                   FLOW 4: USAGE BILLING & INVOICING                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

Customer calls business phone number
         │
         ▼
Twilio routes call → AEVOICE twilioWebhook.ts
         │
         ▼
AI Agent handles call (voice interaction, transcription)
         │
         ▼
Track usage in CommunicationUsage entity:
  • type: "phone_call"
  • direction: "inbound"
  • duration_seconds: 180
  • unit_cost: $0.12/min
  • total_cost: $0.36
  • client_id: {client_id}
  • sent_at: timestamp
         │
         ▼
Daily Cron Job (payrollSync.ts) - Runs at midnight
         │
         ▼
For each client:
  • Query CommunicationUsage for previous day
  • Aggregate usage by type (calls, SMS, emails)
  • Calculate total cost
         │
         ▼
POST https://pay.hellobiz.app/api/usage-sync
  Payload: {
    client_id: "...",
    date: "2026-01-05",
    usage_data: [
      { type: "phone_call", minutes: 120, cost: 14.40 },
      { type: "sms", messages: 5, cost: 0.0375 }
    ],
    total_cost: 14.4375
  }
         │
         ▼
Payroll system receives usage data
         │
         ├─ Create invoice line items
         ├─ Update client account balance
         └─ Trigger invoice generation (if billing cycle complete)
                  │
                  ▼
Invoice sent to client email
Client can pay via Stripe (linked from invoice)


╔═══════════════════════════════════════════════════════════════════════════╗
║                FLOW 5: FLOWSYNC WORKFLOW AUTOMATION                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

Business owner creates workflow in AEVOICE FlowSync UI
         │
         ▼
Workflow Definition:
  Name: "Appointment Reminder"
  Trigger: appointment_booked
  Steps:
    1. Send email confirmation to customer
    2. Wait 24 hours before appointment
    3. Send SMS reminder to customer
    4. Send SMS reminder to business owner
    5. Wait until appointment time
    6. Initiate AI voice call for post-appointment follow-up
         │
         ▼
Save FlowSyncWorkflow entity (status: active)
         │
         ▼
[Later] Appointment booked via AEVOICE or external system
         │
         ▼
Event trigger: appointment_booked
         │
         ▼
flowSyncEngine.ts → action: trigger_event
         │
         ├─ Find all active workflows with trigger: appointment_booked
         └─ For each workflow → Execute steps sequentially
                  │
                  ▼
Step 1: send_email
  • Get customer email from appointment data
  • Send via Base44 SendEmail integration
  • Log success/failure in execution_history
         │
         ▼
Step 2: delay (24 hours before appointment)
  • Calculate delay time
  • Schedule continuation (async job)
         │
         ▼
[After delay] Step 3: send_sms
  • Get customer phone from appointment data
  • Send via Twilio
  • Track in CommunicationUsage
         │
         ▼
Step 4: send_sms (to business owner)
         │
         ▼
Step 5: delay (until appointment time)
         │
         ▼
Step 6: ai_voice_call (post-appointment follow-up)
  • Initiate outbound call via Twilio
  • Use configured agent_id
  • Script: "Thank you for your appointment. How was your experience?"
         │
         ▼
Update FlowSyncWorkflow:
  • last_run_at: timestamp
  • total_runs: +1
  • success_count: +1
  • execution_history: append run log


═══════════════════════════════════════════════════════════════════════════════

                        EXTERNAL INTEGRATIONS

┌────────────────────────────── Third-Party APIs ─────────────────────────────┐
│                                                                              │
│  Voice & Telephony:                                                          │
│  • Twilio Voice API            - Inbound/outbound calls                      │
│  • BSNL WINGS SIP              - SIP registration & routing                  │
│  • ElevenLabs / OpenAI TTS     - Text-to-speech voice synthesis             │
│                                                                              │
│  AI & Language:                                                              │
│  • OpenAI API                  - GPT-4 for conversations, embeddings         │
│  • OpenAI Whisper              - Speech-to-text transcription                │
│                                                                              │
│  Payments:                                                                   │
│  • Stripe API                  - Subscriptions, checkouts, webhooks          │
│                                                                              │
│  CRM Systems (via FlowSync):                                                 │
│  • Salesforce REST API         - Contact sync, opportunity updates           │
│  • HubSpot API                 - Contact & deal management                   │
│  • Zoho CRM API                - Lead & contact sync                         │
│  • Pipedrive API               - Pipeline management                         │
│                                                                              │
│  Calendar Systems (TO BE IMPLEMENTED):                                       │
│  • Google Calendar API         - OAuth, event creation/sync                  │
│  • Microsoft Graph API         - Outlook calendar integration                │
│  • Calendly API                - Booking link generation                     │
│                                                                              │
│  Communication:                                                              │
│  • SendGrid / Base44 Email     - Transactional emails                        │
│  • Twilio SMS                  - Text messages                               │
│  • WhatsApp Business API       - WhatsApp campaigns (future)                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════

                        SECURITY & COMPLIANCE

┌──────────────────────────────── Security Layers ────────────────────────────┐
│                                                                              │
│  Authentication & Authorization:                                             │
│  • JWT-based SSO (HELLOBIZ_JWT_SECRET)                                       │
│  • Base44 platform authentication (user sessions)                            │
│  • API key authentication for webhooks                                       │
│  • Webhook signature verification (Stripe, HelloBiz, Twilio)                 │
│  • Role-based access control (admin, client, partner)                        │
│                                                                              │
│  Data Protection:                                                            │
│  • HTTPS/TLS encryption in transit                                           │
│  • Database encryption at rest (Base44 managed)                              │
│  • Sensitive data tokenization (payment methods)                             │
│  • PII data access logging                                                   │
│                                                                              │
│  Compliance:                                                                 │
│  • GDPR compliance (data deletion, export)                                   │
│  • TCPA compliance (call recording consent)                                  │
│  • PCI DSS compliance (Stripe handles card data)                             │
│  • SOC 2 Type II (planned for Q2 2026)                                       │
│                                                                              │
│  Monitoring & Auditing:                                                      │
│  • Error tracking in critical functions (logger.js)                          │
│  • Webhook delivery tracking                                                 │
│  • API rate limiting (rateLimitMiddleware.ts)                                │
│  • Audit logs for sensitive operations                                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════

                      DEPLOYMENT & INFRASTRUCTURE

┌────────────────────────────── Hosting ──────────────────────────────────────┐
│                                                                              │
│  AEVOICE AI Platform:                                                        │
│  • Frontend: Base44 hosting (CDN-distributed React app)                      │
│  • Backend: Deno Deploy (serverless edge functions)                          │
│  • Database: Base44-managed PostgreSQL (multi-tenant)                        │
│  • File Storage: Base44 object storage (documents, recordings)               │
│                                                                              │
│  Domain Structure:                                                           │
│  • https://aevoice.ai              - Main marketing site                     │
│  • https://ai.hellobiz.app         - AEVOICE platform (alternate domain)     │
│  • https://hellobiz.app            - HelloBiz marketplace (external)         │
│  • https://pay.hellobiz.app        - Payroll/billing system (external)      │
│                                                                              │
│  Scaling:                                                                    │
│  • Edge functions auto-scale (Deno Deploy)                                   │
│  • Database connection pooling                                               │
│  • CDN caching for static assets                                             │
│  • Rate limiting per client (default: 100 req/min)                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════

                           LEGEND

✓ = Fully Implemented and Functional
⚠️ = Placeholder / Needs Implementation
❌ = Not Implemented Yet
🔄 = In Progress
📝 = Planned for Future

Color Coding:
  ┌─────┐  = System/Application Boundary
  │     │
  └─────┘

  ╔═════╗  = Major Platform Section
  ║     ║
  ╚═════╝

  ┌─────┐  = Component/Module
  │     │
  └─────┘

═══════════════════════════════════════════════════════════════════════════════

**END OF ARCHITECTURE DIAGRAM**
