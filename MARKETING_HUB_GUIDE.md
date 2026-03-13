# Marketing Hub Admin Guide

## Overview

The AEVOICE Marketing Hub is a comprehensive multi-channel marketing automation platform that enables businesses to run email, WhatsApp, SMS, voice, and social media campaigns powered by AI-generated content.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Contact Management](#contact-management)
3. [Campaign Creation](#campaign-creation)
4. [Multi-Channel Campaigns](#multi-channel-campaigns)
5. [Cost & Billing](#cost-and-billing)
6. [Consent Management](#consent-management)
7. [Integrations](#integrations)
8. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

Before using the Marketing Hub, ensure you have:

- **Active AEVOICE Account** with marketing features enabled
- **Configured Integrations** (see [Integrations Hub Guide](./INTEGRATIONS_HUB_GUIDE.md))
  - SendGrid API key (for email)
  - Twilio credentials (for WhatsApp, SMS, voice)
  - Google AI API key (optional, for video generation)
- **Phone Number** provisioned for WhatsApp/voice campaigns
- **AI Agent** created for voice campaigns

### Accessing Marketing Hub

1. Log in to your AEVOICE dashboard
2. Navigate to **Marketing Hub** from the sidebar
3. You'll see four main tabs:
   - **Overview**: Dashboard with campaign stats
   - **Campaigns**: Manage all campaigns
   - **Workflows**: Automation workflows
   - **Contacts**: Contact database

---

## Contact Management

### Importing Contacts

#### Bulk Upload (CSV/Excel)

1. Click **Upload Contacts** button
2. Select your CSV or Excel file
3. Ensure your file has these columns (optional):
   - `email` - Email address
   - `phone` - Phone number with country code (e.g., +1234567890)
   - `full_name` - Full name
   - `first_name` - First name
   - `last_name` - Last name
   - `company` - Company name
   - `tags` - Comma-separated tags (e.g., "vip,customer")
   - `funnel_stage` - lead, prospect, customer, or churned
   - `twitter_handle` - Twitter handle
   - `linkedin_url` - LinkedIn profile URL
   - `facebook_url` - Facebook profile URL

4. **Select Consent Type**:
   - **All Channels**: Subscribers to email, WhatsApp, SMS, and voice
   - **Email Only**: Email subscription only
   - **WhatsApp Only**: WhatsApp subscription only
   - **SMS Only**: SMS subscription only
   - **Voice Only**: Voice call subscription only

5. Click **Upload** and wait for processing
6. Review the import summary (contacts created, skipped, errors)

**Important Notes:**
- At least one of `email` or `phone` is required per contact
- Duplicate emails are automatically skipped
- Consent dates are automatically recorded for compliance

#### Manual Contact Entry

1. Navigate to **Contacts** tab
2. Click **Add Contact** button
3. Fill in contact details
4. Select channel subscriptions
5. Click **Save**

### Managing Contact Lists

- **Filtering**: Use tags and funnel stages to segment contacts
- **Editing**: Click on any contact to edit their details
- **Unsubscribe**: Contacts can be unsubscribed from specific channels
- **Delete**: Remove contacts completely (use with caution - this is permanent)

---

## Campaign Creation

### Creating a New Campaign

1. Click **Create Campaign** button
2. Select campaign type:
   - Email
   - WhatsApp
   - Voice Call
   - SMS
   - Social Post (Twitter, LinkedIn, Facebook)
   - Video (AI-generated with Google Veo)

3. Fill in campaign details:
   - **Name**: Internal campaign name
   - **Goal**: What you want to achieve (e.g., "Promote holiday sale", "Book demo calls")
   - **Target Audience**: Select tags or funnel stages to filter recipients

### AI Content Generation

1. After selecting campaign type, describe your campaign:
   ```
   Example: "Promote our new AI chatbot feature. Offer 30% off 
   for the first month. Target existing customers. Professional 
   tone with urgency."
   ```

2. Click **Generate Content** button
3. AI will create channel-specific content:
   - Email: Subject line, HTML body, CTA
   - WhatsApp: Conversational message
   - Voice: Natural script for AI agent
   - Social: Engaging post with hashtags

4. Review and edit the generated content as needed
5. Customize CTA text and URL

### Scheduling Campaigns

- **Send Now**: Sends immediately after confirmation
- **Schedule**: Pick date and time for automated sending
- **Save as Draft**: Save for later editing

---

## Multi-Channel Campaigns

### Email Campaigns

**Requirements:**
- SendGrid API key configured
- From email address set
- Contact list with email subscribers

**Features:**
- HTML email templates
- Personalization with contact variables
- Click tracking (if SendGrid configured)
- Open rate tracking

**Pricing:**
- SendGrid charges apply (typically $0.0001 per email)
- No platform markup on email

### WhatsApp Campaigns

**Requirements:**
- Twilio credentials configured
- WhatsApp-enabled phone number
- Contacts with phone numbers and WhatsApp consent

**Features:**
- Rich text messaging
- Media attachments (images, PDFs)
- Conversation-based pricing
- Delivery confirmations

**Pricing:**
- Twilio WhatsApp: ~$0.005 per message
- Platform markup: 20%
- **Total**: ~$0.006 per message

**Consent Required**: Yes (user must consent to marketing charges)

### Voice Call Campaigns

**Requirements:**
- Twilio credentials configured
- AI agent created and configured
- Phone number for outbound calls
- Contacts with phone numbers and voice consent

**Features:**
- AI-powered conversations
- Natural voice synthesis
- Call recordings (if enabled)
- Real-time call analytics

**Pricing (per 2-minute average call):**
- Twilio voice: $0.02/minute = $0.04
- LLM tokens (GPT-4): ~2k tokens = $0.06
- TTS (ElevenLabs): ~1k chars = $0.015
- **Net Cost**: $0.115
- Platform markup: 20%
- **Total Charged**: ~$0.138 per call

**Consent Required**: Yes (user must consent to marketing charges)

### SMS Campaigns

**Requirements:**
- Twilio credentials configured
- Phone number for SMS
- Contacts with phone numbers and SMS consent

**Features:**
- Text-only messages (160 chars)
- High deliverability
- Delivery receipts

**Pricing:**
- Twilio SMS: ~$0.0075 per message
- Platform markup: 20%
- **Total**: ~$0.009 per message

**Consent Required**: Yes (user must consent to marketing charges)

### Social Media Campaigns

**Requirements:**
- Platform-specific API keys (coming soon)
- Connected social accounts

**Features:**
- Cross-post to multiple platforms
- AI-generated content per platform
- Hashtag optimization
- Image/video attachments

**Pricing:**
- API costs vary by platform
- Platform markup: 20%

---

## Cost & Billing

### Understanding Marketing Costs

Marketing campaigns incur costs from third-party providers (Twilio, SendGrid, OpenAI, ElevenLabs). AEVOICE adds a **20% markup** to cover:

- Platform infrastructure
- AI processing and orchestration
- Analytics and reporting
- Support and maintenance

### Cost Breakdown

| Channel | Provider | NET Cost (Admin) | Markup | Charged to User |
|---------|----------|------------------|--------|----------------|
| Email | SendGrid | $0.0001 | 0% | $0.0001 |
| WhatsApp | Twilio | $0.005 | 20% | $0.006 |
| SMS | Twilio | $0.0075 | 20% | $0.009 |
| Voice (2 min) | Twilio + LLM + TTS | $0.115 | 20% | $0.138 |

### Cost Tracking

- View campaign costs in **Campaign Details** page
- Check **Estimated Cost** before sending
- Review **Actual Cost** after campaign completes
- Download cost reports from **Analytics** tab

### Wallet & Billing

- Pre-fund your AEVOICE wallet to enable marketing features
- Auto-recharge available (configure in Settings → Billing)
- Low balance alerts via email and dashboard

---

## Consent Management

### Why Consent Matters

- **Legal Compliance**: GDPR, TCPA, CAN-SPAM, CASL
- **Cost Transparency**: Users must know they'll be charged
- **Trust Building**: Explicit consent improves deliverability

### Consent Types

1. **Email**: Required for email campaigns (usually pre-consent via signup)
2. **WhatsApp**: Explicit opt-in required
3. **SMS**: Explicit opt-in required
4. **Voice**: Explicit opt-in required
5. **Marketing Charges**: User must consent to platform fees

### How Consent is Tracked

- **Contact Level**: Each contact has channel-specific subscription flags
- **Consent Date**: Timestamp recorded when consent given
- **Campaign Level**: User confirms marketing charges before sending

### Best Practices

✅ **DO:**
- Get explicit written consent before adding to marketing lists
- Honor unsubscribe requests immediately
- Keep consent records for compliance audits
- Provide easy opt-out in every message

❌ **DON'T:**
- Add purchased email lists without consent
- Send to unsubscribed contacts
- Hide unsubscribe links
- Use pre-checked consent boxes

---

## Integrations

See [Integrations Hub Admin Guide](./INTEGRATIONS_HUB_GUIDE.md) for detailed setup instructions.

### Required Integrations

1. **SendGrid** (for email)
   - Sign up at sendgrid.com
   - Create API key with "Mail Send" permissions
   - Add key in Integrations Hub → API Keys

2. **Twilio** (for WhatsApp, SMS, voice)
   - Sign up at twilio.com
   - Get Account SID and Auth Token
   - Purchase/configure phone numbers
   - Add credentials in Integrations Hub → Twilio

3. **AI Models** (for content generation)
   - OpenAI API key (GPT-4) - recommended
   - Google AI API key (Veo) - optional for video

### Optional Integrations

- **CRM Webhooks**: Sync contacts to HubSpot, Salesforce, etc.
- **Zapier**: Connect to 5000+ apps
- **Slack**: Get campaign notifications

---

## Best Practices

### Campaign Strategy

1. **Segment Your Audience**
   - Use tags and funnel stages
   - Send relevant messages to each segment
   - A/B test different segments

2. **Optimize Send Times**
   - Email: Tuesday-Thursday 10am-2pm
   - WhatsApp: Business hours of recipient's timezone
   - Voice: Avoid early morning and late evening

3. **Personalize Content**
   - Use contact's name in greetings
   - Reference their company or industry
   - Tailor offers to funnel stage

4. **Test Before Sending**
   - Send test emails to yourself
   - Test WhatsApp messages to your number
   - Make test voice calls to verify agent script

### Content Guidelines

**Email:**
- Keep subject lines under 50 characters
- Use clear, prominent CTAs
- Mobile-responsive design
- Include plain text version

**WhatsApp:**
- Keep messages under 1000 characters
- Use emojis sparingly 😊
- Break text into short paragraphs
- Include clear next steps

**Voice:**
- Keep scripts under 200 words
- Use natural, conversational language
- Allow for customer interruptions
- Have clear call objectives

### Compliance

- **CAN-SPAM** (USA): Include physical address, honor opt-outs within 10 days
- **GDPR** (EU): Get explicit consent, provide data access/deletion
- **TCPA** (USA): Get written consent for automated calls/texts
- **CASL** (Canada): Get express consent, identify sender clearly

---

## Troubleshooting

### Common Issues

**Issue**: "No contacts found for campaign"
- **Solution**: Check that contacts have required channel subscriptions and valid contact info (email/phone)

**Issue**: "Twilio credentials not configured"
- **Solution**: Add Twilio Account SID and Auth Token in Integrations Hub

**Issue**: "Campaign send failed"
- **Solution**: Check wallet balance. Ensure integrations are active. Review campaign logs for specific errors.

**Issue**: "Low deliverability on email campaigns"
- **Solution**: Verify sender email with SendGrid. Check SPF/DKIM records. Remove bounced emails from list.

**Issue**: "Voice campaign calls not connecting"
- **Solution**: Verify phone number is capable of outbound calls. Check agent is active. Ensure recipient numbers are valid.

---

## Support

For additional help:

- **Documentation**: https://docs.aevoice.ai
- **Support Email**: support@aevoice.ai
- **Community**: https://community.aevoice.ai
- **Status Page**: https://status.aevoice.ai

---

## Appendix

### Glossary

- **CTA**: Call to Action
- **Funnel Stage**: Position in sales pipeline (lead, prospect, customer, churned)
- **LLM**: Large Language Model (AI for conversations)
- **NET Cost**: Provider charges without markup
- **RLS**: Row Level Security
- **TTS**: Text-to-Speech (voice synthesis)

### API Reference

For developers integrating with Marketing Hub:

- **Bulk Upload**: `POST /functions/bulkUploadContacts`
- **Send WhatsApp**: `POST /functions/sendWhatsAppCampaign`
- **Send Voice**: `POST /functions/sendVoiceCampaign`
- **Send Email**: `POST /functions/sendMarketingEmail`

See [API Documentation](https://docs.aevoice.ai/api) for details.
