# HelloBiz Master Architecture Implementation Guide

## Overview

This document describes the implementation of the HelloBiz Master Architecture, focusing on:
1. Pay.hellobiz.app API integration for financial management
2. Twilio WhatsApp sub-account system with 25% markup pricing
3. Stripe auto-debit usage billing
4. Marketing Hub pricing with 25% profit margin
5. External platform integrations (Viral Dashboard, Flaxxa AI, LeadsFynder, Flowomatic)
6. Email engine priority system (Base44 → ZoaZone Services → SendGrid)

---

## Architecture Principles

### Central Orchestration
FlowSync (workautomation.app) serves as the central orchestrator for all automated workflows, including:
- Partner onboarding
- Agent deployment
- Financial transactions
- Marketing campaigns

### Pricing Model
All external services use a consistent 25% profit margin pricing model:

```
User Cost = (Platform Net Cost) + (25% Profit) + (Applicable Tax)

Example:
Platform cost: $10.00
Profit (25%): $2.50
Subtotal: $12.50
Tax (varies): $0.00
Total: $12.50
```

---

## Part 1: Pay.hellobiz.app Integration

### Files Created
- `functions/lib/payHelloBizClient.ts` - Complete API client
- `functions/payHelloBizSync.ts` - Synchronization function

### Features Implemented

#### 1. Accounting API
- Create and retrieve accounting entries
- Support for income, expense, asset, and liability transactions
- Automatic categorization and client/agency tagging

#### 2. Payroll API
- Create payroll entries for employees
- Process payroll for specific periods
- Track payroll status (pending, processed, paid)

#### 3. Transaction Recording API
- Record all financial transactions
- Link to clients and agencies
- Support for multiple currencies

#### 4. Invoice Generation API
- Generate professional invoices
- Track invoice status (draft, sent, paid, overdue, cancelled)
- Multiple line items support
- Automatic tax calculation

#### 5. Financial Reporting API
- Generate income statements
- Balance sheets
- Cash flow reports
- Profit & loss statements
- Customizable date ranges

#### 6. Auto-Reconciliation
- Automatic matching of transactions
- Identify discrepancies
- Manual resolution support

### Usage Example

```typescript
import { createPayHelloBizClient } from "./lib/payHelloBizClient.ts";

// Create client
const payClient = createPayHelloBizClient();

// Sync usage costs
await payClient.syncUsageCosts({
  clientId: "client_123",
  period: "2026-01",
  costs: {
    aiLlmCost: 15.50,
    voiceTtsCost: 8.25,
    telephonyCost: 12.00,
    platformOverheadCost: 3.58,
    totalCost: 39.33,
  },
  revenue: {
    grossRevenue: 100.00,
    netProfit: 60.67,
    agencyShare: 45.50,
    platformShare: 15.17,
  },
});

// Generate invoice
const invoice = await payClient.generateInvoice({
  clientId: "client_123",
  issueDate: "2026-01-15",
  dueDate: "2026-02-15",
  items: [
    { description: "AI Voice Services", quantity: 1, unitPrice: 50.00, amount: 50.00 },
    { description: "WhatsApp Messages", quantity: 100, unitPrice: 0.50, amount: 50.00 },
  ],
  subtotal: 100.00,
  tax: 0.00,
  total: 100.00,
  status: "draft",
});
```

### Environment Variables Required

```bash
# Pay.hellobiz.app API
PAY_HELLOBIZ_API_URL=https://pay.hellobiz.app/api
PAY_HELLOBIZ_API_KEY=your_api_key_here
```

---

## Part 2: Twilio WhatsApp Sub-Account System

### Files Created
- `functions/whatsappSubAccount.ts` - Sub-account management
- `functions/lib/billingEngine.ts` - Billing calculator

### Features Implemented

#### 1. Sub-Account Creation
Two modes supported:
- **Platform Managed**: User uses Zoa Zone's main Twilio account (25% markup)
- **User Credentials**: User provides their own Twilio account (direct passthrough)

#### 2. Usage Tracking
- Messages sent
- Conversations started
- Twilio net cost
- Profit calculation
- Tax calculation

#### 3. Billing with 25% Markup

```typescript
import { createBillingEngine } from "./lib/billingEngine.ts";

const engine = createBillingEngine();

// Calculate WhatsApp billing
const billing = engine.calculateWhatsAppBilling(
  10.00,  // Twilio net cost
  0       // Tax percentage (0% for now)
);

// Result:
// {
//   platformNetCost: 10.00,
//   profitAmount: 2.50,
//   subtotal: 12.50,
//   taxAmount: 0.00,
//   totalAmount: 12.50
// }
```

### Usage Example

```typescript
// Create WhatsApp sub-account
const result = await base44.functions.invoke("whatsappSubAccount", {
  action: "createWhatsAppSubAccount",
  clientId: "client_123",
  businessName: "My Business",
  contactEmail: "contact@mybusiness.com",
  contactPhone: "+1234567890",
  usePlatformAccount: true,  // Use Zoa Zone's account
});

// Record usage
await base44.functions.invoke("whatsappSubAccount", {
  action: "recordWhatsAppUsage",
  clientId: "client_123",
  messagesSent: 100,
  conversationsStarted: 25,
  twilioNetCost: 5.00,
});
```

### Database Schema Required

```sql
CREATE TABLE whatsapp_usage (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL,
  period VARCHAR(7) NOT NULL,  -- YYYY-MM format
  messages_sent INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  twilio_net_cost DECIMAL(10,2) DEFAULT 0,
  profit_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Part 3: Stripe Auto-Debit Usage Billing

### Files Created
- `functions/processUsageBilling.ts` - Monthly billing processor

### Features Implemented

#### 1. Monthly Billing Processor
- Aggregates usage across all services
- Calculates total costs with 25% markup
- Creates Stripe invoices
- Enables auto-debit

#### 2. Billing Aggregation
Consolidates costs from:
- WhatsApp messaging
- Email campaigns
- Voice campaigns
- Social media posts
- AI processing
- Storage

#### 3. Stripe Integration
- Automatic invoice creation
- Auto-finalize invoices
- Collection method: charge_automatically
- Customer creation and management

### Usage Example

```typescript
// Process monthly billing for a client
const result = await base44.functions.invoke("processUsageBilling", {
  action: "processMonthlyBilling",
  clientId: "client_123",
  period: "2026-01",
  taxPercentage: 0,
  dryRun: false,  // Set to true for testing
});

// Process billing for all clients
await base44.functions.invoke("processUsageBilling", {
  action: "processBillingForAllClients",
  period: "2026-01",
  taxPercentage: 0,
  limit: 100,
});
```

### Database Schema Required

```sql
CREATE TABLE usage_billing (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL,
  period VARCHAR(7) NOT NULL,  -- YYYY-MM format
  platform_cost DECIMAL(10,2) DEFAULT 0,
  profit_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  stripe_invoice_id VARCHAR(255),
  usage_details JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Part 4: Marketing Hub Pricing

### Files Created
- `functions/marketingHubBilling.ts` - Marketing campaign billing

### Features Implemented

#### 1. Campaign Cost Calculator
Platform cost rates (configurable):
- Email: $1.00 per 1,000 emails (via zoazoneservices.com)
- WhatsApp: $0.005 per message (via Twilio)
- Social Media: $0.10 per post (API costs)
- Voice: $0.015 per minute (via AEVOICE)

#### 2. Campaign Types Supported
- Email campaigns
- WhatsApp campaigns
- Social media campaigns
- Voice campaigns
- Multi-channel campaigns

#### 3. Usage Tracking
Per-campaign and aggregated tracking across:
- Recipients reached
- Messages sent
- Posts published
- Call minutes

### Usage Example

```typescript
// Calculate campaign billing
const result = await base44.functions.invoke("marketingHubBilling", {
  action: "calculateCampaignBilling",
  clientId: "client_123",
  campaignType: "multi_channel",
  emailRecipients: 5000,
  whatsappMessages: 500,
  socialMediaPosts: 10,
  voiceCallMinutes: 0,
  taxPercentage: 0,
});

// Record usage
await base44.functions.invoke("marketingHubBilling", {
  action: "recordMarketingUsage",
  clientId: "client_123",
  campaignId: "campaign_456",
  campaignType: "email",
  emailRecipients: 5000,
});
```

### Database Schema Required

```sql
CREATE TABLE marketing_hub_usage (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL,
  campaign_id VARCHAR(255),
  campaign_type VARCHAR(50) NOT NULL,
  period VARCHAR(7) NOT NULL,  -- YYYY-MM format
  email_recipients INTEGER DEFAULT 0,
  whatsapp_messages INTEGER DEFAULT 0,
  social_media_posts INTEGER DEFAULT 0,
  voice_call_minutes DECIMAL(10,2) DEFAULT 0,
  email_cost DECIMAL(10,2) DEFAULT 0,
  whatsapp_cost DECIMAL(10,2) DEFAULT 0,
  social_media_cost DECIMAL(10,2) DEFAULT 0,
  voice_cost DECIMAL(10,2) DEFAULT 0,
  total_platform_cost DECIMAL(10,2) DEFAULT 0,
  profit_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Part 5: External Platform Integrations

### Files Created
- `functions/lib/externalIntegrations.ts` - API clients for external platforms

### Platforms Integrated

#### 1. Viral Dashboard (app.viraldashboard.io)
- Social media account connection
- Post scheduling
- Analytics and reporting

#### 2. Flaxxa AI (ai.flaxxa.com)
- AI content generation
- Content improvement
- Image generation

#### 3. LeadsFynder (app.leadsfynder.com)
- Lead search and prospecting
- Lead data enrichment
- Email verification

#### 4. Flowomatic (app.flowomatic.com)
- Workflow creation
- Workflow execution
- Status monitoring

### Usage Example

```typescript
import { 
  createViralDashboardClient,
  createFlaxxaAIClient,
  createLeadsFynderClient,
  createFlowomaticClient 
} from "./lib/externalIntegrations.ts";

// Viral Dashboard
const viralClient = createViralDashboardClient();
await viralClient.schedulePost({
  accountIds: ["account_123"],
  content: "Check out our new AI voice assistant!",
  scheduledTime: "2026-01-20T10:00:00Z",
});

// Flaxxa AI
const flaxxaClient = createFlaxxaAIClient();
const content = await flaxxaClient.generateContent({
  contentType: "social_media",
  prompt: "Write a post about AI voice assistants",
  tone: "professional",
  length: "short",
});

// LeadsFynder
const leadsClient = createLeadsFynderClient();
const leads = await leadsClient.searchLeads({
  industry: "Healthcare",
  location: "United States",
  limit: 50,
});

// Flowomatic
const flowClient = createFlowomaticClient();
const workflow = await flowClient.createWorkflow({
  name: "Lead Nurture Campaign",
  trigger: { type: "lead_captured", config: {} },
  actions: [
    { type: "send_email", config: { template: "welcome" } },
    { type: "add_to_crm", config: { list: "prospects" } },
  ],
  userId: "user_123",
});
```

### Environment Variables Required

```bash
# Viral Dashboard
VIRAL_DASHBOARD_API_URL=https://app.viraldashboard.io/api
VIRAL_DASHBOARD_API_KEY=your_api_key

# Flaxxa AI
FLAXXA_AI_API_URL=https://ai.flaxxa.com/api
FLAXXA_AI_API_KEY=your_api_key

# LeadsFynder
LEADS_FYNDER_API_URL=https://app.leadsfynder.com/api
LEADS_FYNDER_API_KEY=your_api_key

# Flowomatic
FLOWOMATIC_API_URL=https://app.flowomatic.com/api
FLOWOMATIC_API_KEY=your_api_key
```

---

## Part 6: Email Engine Priority System

### Files Modified
- `functions/lib/emailService.ts` - Updated with priority system

### Priority Hierarchy

**Priority 1: Base44 Credits (Internal)**
- Use for internal users when credits available
- Fastest and most cost-effective
- Automatic fallback if insufficient credits

**Priority 2: ZoaZone Services (Personal/Branded)**
- Personal emails
- Branded invitations
- Clarification messages
- Loop notifications
- Custom domain support (@zoazoneservices.com or white-label)

**Priority 3: SendGrid (External Marketing)**
- External marketing campaigns
- Bulk emails
- Fallback for all other scenarios

### Email Types Supported
- `personal` - Personal communications
- `branded` - Branded business emails
- `clarification` - Clarification requests
- `loop` - Loop notifications
- `notification` - System notifications
- `marketing` - Marketing campaigns (defaults to SendGrid)

### Usage Example

```typescript
import { sendEmailWithHierarchy } from "./lib/emailService.ts";

// Send personal email (uses ZoaZone Services if Base44 credits low)
await sendEmailWithHierarchy(req, {
  to: "customer@example.com",
  subject: "Welcome to AEVOICE",
  body: "<h1>Welcome!</h1><p>Thank you for signing up.</p>",
  from_name: "AEVOICE Team",
  from_email: "hello@zoazoneservices.com",
  email_type: "personal",
  client_id: "client_123",
});

// Send marketing email (uses SendGrid)
await sendEmailWithHierarchy(req, {
  to: ["customer1@example.com", "customer2@example.com"],
  subject: "New Features Announcement",
  body: "<h1>Check out what's new!</h1>",
  marketing: true,
  email_type: "marketing",
});
```

### Environment Variables Required

```bash
# ZoaZone Services
ZOAZONE_SERVICES_API_URL=https://zoazoneservices.com/api
ZOAZONE_SERVICES_API_KEY=your_api_key

# SendGrid (existing)
SENDGRID_API_KEY=your_sendgrid_key
```

---

## Part 7: Testimonials Fix

### Changes Made
- Changed "Animal Welfare Society (AES)" to "Animal Welfare Society (AWS)"
- Added website URLs for all testimonials:
  - VetNPet Hospital: vetnpethospital.com
  - Animal Welfare Society (AWS): animalwelfaresociety.in
  - ZoaZone Services: zoazoneservices.com
  - Hyderabad Estate: hyderabadestate.in
  - Pay HelloBiz: pay.hellobiz.app
  - HelloBiz: hellobiz.app

### File Modified
- `src/components/home/Testimonials.jsx`

---

## Testing Guide

### 1. Test Pay.hellobiz.app Integration

```bash
# Sync usage costs
curl -X POST https://aevoice.ai/functions/payHelloBizSync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "syncUsageCosts",
    "clientId": "client_123",
    "period": "2026-01"
  }'

# Generate invoice
curl -X POST https://aevoice.ai/functions/payHelloBizSync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generateInvoice",
    "clientId": "client_123",
    "issueDate": "2026-01-15",
    "dueDate": "2026-02-15",
    "items": [
      {"description": "Services", "quantity": 1, "unitPrice": 100, "amount": 100}
    ]
  }'
```

### 2. Test WhatsApp Sub-Account

```bash
# Create sub-account
curl -X POST https://aevoice.ai/functions/whatsappSubAccount \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createWhatsAppSubAccount",
    "clientId": "client_123",
    "businessName": "Test Business",
    "contactEmail": "test@example.com",
    "contactPhone": "+1234567890",
    "usePlatformAccount": true
  }'

# Record usage
curl -X POST https://aevoice.ai/functions/whatsappSubAccount \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "recordWhatsAppUsage",
    "clientId": "client_123",
    "messagesSent": 100,
    "conversationsStarted": 25,
    "twilioNetCost": 5.00
  }'
```

### 3. Test Usage Billing

```bash
# Dry run billing
curl -X POST https://aevoice.ai/functions/processUsageBilling \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "processMonthlyBilling",
    "clientId": "client_123",
    "period": "2026-01",
    "dryRun": true
  }'
```

### 4. Test Marketing Hub Billing

```bash
# Calculate campaign billing
curl -X POST https://aevoice.ai/functions/marketingHubBilling \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "calculateCampaignBilling",
    "clientId": "client_123",
    "campaignType": "email",
    "emailRecipients": 5000
  }'
```

---

## Deployment Checklist

### Environment Variables
- [ ] PAY_HELLOBIZ_API_URL
- [ ] PAY_HELLOBIZ_API_KEY
- [ ] ZOAZONE_SERVICES_API_URL
- [ ] ZOAZONE_SERVICES_API_KEY
- [ ] VIRAL_DASHBOARD_API_KEY (optional)
- [ ] FLAXXA_AI_API_KEY (optional)
- [ ] LEADS_FYNDER_API_KEY (optional)
- [ ] FLOWOMATIC_API_KEY (optional)

### Database Migrations
- [ ] Create `whatsapp_usage` table
- [ ] Create `marketing_hub_usage` table
- [ ] Create `usage_billing` table

### Stripe Configuration
- [ ] Ensure auto-debit is enabled for customers
- [ ] Configure invoice settings
- [ ] Set up webhook handlers for payment events

### Testing
- [ ] Test Pay.hellobiz.app sync
- [ ] Test WhatsApp sub-account creation
- [ ] Test usage billing calculation
- [ ] Test Stripe invoice generation
- [ ] Test email priority system

---

## Security Considerations

### API Key Management
- All API keys stored in environment variables
- Never commit keys to repository
- Rotate keys regularly

### Data Protection
- Sensitive credentials encrypted by Base44
- User data isolated by client_id
- Admin-only access for billing functions

### Rate Limiting
- Implement rate limiting on public endpoints
- Monitor API usage for abuse
- Set reasonable timeouts (30 seconds default)

---

## Monitoring & Logging

### Key Metrics to Monitor
- API response times
- Billing calculation accuracy
- Cost tracking completeness
- Email delivery success rates
- External integration uptime

### Log Format
All functions use structured JSON logging:

```json
{
  "timestamp": "2026-01-17T18:40:00Z",
  "level": "info",
  "message": "WhatsApp sub-account created successfully",
  "request_id": "req_123abc",
  "telephony_account_id": "ta_456def",
  "mode": "platform_managed"
}
```

---

## Future Enhancements

### Short Term
1. Add OAuth framework for external integrations
2. Create admin dashboard UI for Pay.hellobiz.app
3. Implement real-time usage tracking webhooks
4. Add multi-currency support

### Medium Term
1. Add more external platform integrations
2. Create automated reconciliation workflows
3. Implement usage forecasting
4. Add billing analytics dashboard

### Long Term
1. Machine learning for cost optimization
2. Predictive usage modeling
3. Automated pricing adjustments
4. Advanced financial reporting

---

## Support & Troubleshooting

### Common Issues

**Issue: Pay.hellobiz.app API timeout**
- Check network connectivity
- Verify API key is valid
- Increase timeout if needed

**Issue: WhatsApp usage not tracking**
- Ensure `whatsapp_usage` table exists
- Check client_id is valid
- Verify Twilio credentials

**Issue: Stripe invoice not created**
- Check Stripe API key
- Verify customer exists
- Ensure amount > 0

### Getting Help
- Check function logs in Base44 dashboard
- Review this documentation
- Contact support with request_id for specific issues

---

**Last Updated:** January 17, 2026  
**Version:** 1.0  
**Author:** AEVOICE Development Team
