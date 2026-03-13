# Integrations Hub Admin Guide

## Overview

The Integrations Hub is a centralized control panel for managing all third-party integrations, API keys, webhooks, and service configurations in AEVOICE. This guide covers setup and management of all integration types.

---

## Table of Contents

1. [Accessing Integrations Hub](#accessing-integrations-hub)
2. [API Keys Management](#api-keys-management)
3. [Webhook Configuration](#webhook-configuration)
4. [Twilio Integration](#twilio-integration)
5. [Email Configuration](#email-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Accessing Integrations Hub

1. Log in to your AEVOICE dashboard
2. Navigate to **Integrations Hub** from the sidebar (or Settings → Integrations)
3. You'll see four main tabs:
   - **API Keys**: Third-party service API keys
   - **Webhooks**: Custom webhook endpoints
   - **Twilio**: Telephony and messaging configuration
   - **Email**: Email service settings

---

## API Keys Management

### Overview

API keys enable AEVOICE to connect with external services for enhanced functionality. All API keys are encrypted and stored securely in the Base44 platform.

### SendGrid API Key

**Purpose**: Send marketing emails via SendGrid

**Setup Steps:**

1. Sign up for a SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Navigate to Settings → API Keys in SendGrid dashboard
3. Click **Create API Key**
4. Name it "AEVOICE Integration"
5. Select **Full Access** or at minimum **Mail Send** permissions
6. Copy the generated API key (you won't see it again!)
7. In AEVOICE Integrations Hub → API Keys tab:
   - Paste the key in **SendGrid API Key** field
   - Click **Save SendGrid Key**

**Verification:**
- Send a test email from Marketing Hub
- Check SendGrid dashboard for activity

**Pricing**: SendGrid Free tier includes 100 emails/day. Paid plans start at $15/month for 40,000 emails.

---

### Google AI API Key (Veo)

**Purpose**: Generate AI videos for marketing campaigns

**Setup Steps:**

1. Sign up for Google Cloud at [cloud.google.com](https://cloud.google.com)
2. Enable the **Vertex AI** API
3. Create API credentials:
   - Go to APIs & Services → Credentials
   - Click **Create Credentials** → **API Key**
   - Restrict the key to Vertex AI API
4. Copy the API key
5. In AEVOICE Integrations Hub → API Keys tab:
   - Paste the key in **Google AI API Key (Veo)** field
   - Click **Save Google AI Key**

**Verification:**
- Create a video campaign in Marketing Hub
- Check Google Cloud console for API usage

**Pricing**: Google Veo pricing varies. Check [Google Cloud Pricing](https://cloud.google.com/pricing).

---

### OpenAI API Key

**Purpose**: AI content generation and embeddings for knowledge base

**Setup Steps:**

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Click **Create new secret key**
4. Name it "AEVOICE Integration"
5. Copy the key (starts with `sk-`)
6. In AEVOICE Integrations Hub → API Keys tab:
   - Paste the key in **OpenAI API Key** field
   - Click **Save OpenAI Key**

**Verification:**
- Generate AI content in Marketing Hub
- Check OpenAI dashboard for usage

**Pricing**: OpenAI charges per token. GPT-4 Turbo: $0.01/1K input tokens, $0.03/1K output tokens.

---

### Viewing and Managing Keys

**Show/Hide Keys:**
- Click the 👁️ (eye) icon to reveal the full key
- Click again to hide it

**Copy Keys:**
- Click the 📋 (copy) icon to copy to clipboard

**Rotating Keys:**
1. Generate a new key in the provider's dashboard
2. Update the key in AEVOICE Integrations Hub
3. Test functionality
4. Revoke the old key in the provider's dashboard

---

## Webhook Configuration

### What are Webhooks?

Webhooks allow AEVOICE to send real-time event notifications to your external systems (CRM, analytics, custom apps) whenever specific events occur.

### Creating a Webhook

1. Navigate to **Webhooks** tab
2. Click **Add Webhook** button
3. Fill in webhook details:

**Webhook Name**: Internal identifier (e.g., "HubSpot CRM Sync")

**Endpoint URL**: Your server's webhook receiver URL
   ```
   https://your-domain.com/aevoice-webhook
   ```

**Webhook Secret (Optional)**: Used to verify webhook signatures
   - Leave empty to auto-generate
   - Or provide your own secret

**Events**: Select which events to receive notifications for:
   - ✅ Call Started
   - ✅ Call Ended
   - ✅ Lead Captured
   - ✅ Appointment Booked

4. Click **Create Webhook**

### Webhook Payload Format

```json
{
  "event": "lead_captured",
  "timestamp": "2024-01-15T12:30:00Z",
  "data": {
    "contact_id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "source": "widget",
    "agent_id": "uuid"
  },
  "signature": "sha256_hash"
}
```

### Verifying Webhook Signatures

To ensure webhooks are from AEVOICE, verify the signature:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}
```

### Managing Webhooks

**Edit Webhook:**
- Click on a webhook card
- Update URL or events
- Click **Save Changes**

**Delete Webhook:**
- Click the 🗑️ (trash) icon on the webhook card
- Confirm deletion

**Testing Webhooks:**
- Use a service like [webhook.site](https://webhook.site) to test
- Check webhook logs in your server to verify receipt

---

## Twilio Integration

### Overview

Twilio powers WhatsApp messaging, SMS, and voice calls in AEVOICE. Proper configuration is essential for marketing campaigns and telephony features.

### Prerequisites

1. **Twilio Account**: Sign up at [twilio.com](https://twilio.com)
2. **Verified Identity**: Complete Twilio's verification process
3. **Phone Number**: Purchase a Twilio phone number

### Basic Configuration

1. Navigate to **Twilio** tab in Integrations Hub
2. Fill in Twilio credentials:

**Twilio Account SID:**
   - Found in Twilio Console dashboard
   - Starts with `AC...`
   
**Twilio Auth Token:**
   - Found in Twilio Console dashboard
   - Click "Show" to reveal it
   - Treat as a password (never share publicly)

**WhatsApp Sender ID:**
   - Your Twilio WhatsApp-enabled number
   - Format: `+1234567890`
   - Must be WhatsApp-approved by Twilio

**Voice Sender ID:**
   - Your Twilio phone number for outbound calls
   - Format: `+1234567890`

3. Click **Save Twilio Configuration**

### WhatsApp Setup (Advanced)

**Twilio Sandbox (Testing):**
1. In Twilio Console, go to Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to join sandbox
3. Use sandbox number for testing (e.g., `+14155238886`)

**Production WhatsApp:**
1. Request WhatsApp sender approval from Twilio
2. Requires business verification and Facebook Business Manager
3. Setup templates for pre-approved messages
4. See [Twilio WhatsApp Guide](https://www.twilio.com/docs/whatsapp)

**Important Notes:**
- WhatsApp has strict anti-spam policies
- Templates must be pre-approved for 24-hour windows
- User must initiate conversation or opt-in via other channel

### Twilio Sub-Accounts (Enterprise)

For marketing compliance and cost tracking, you may want separate Twilio sub-accounts.

**Why Use Sub-Accounts:**
- Isolate marketing spend from operational costs
- Separate test/production environments
- Assign different team access levels

**Setup Steps:**
1. In Twilio Console, go to Account → Sub-accounts
2. Click **Create new sub-account**
3. Name it (e.g., "AEVOICE Marketing")
4. Copy the sub-account SID and auth token
5. Use these credentials in AEVOICE Integrations Hub instead of main account

**Limitations:**
- Base44 abstracts some Twilio features
- Direct Twilio console access required for advanced configs
- AEVOICE provides maximum feasible configuration within platform

### Voice Configuration

**Outbound Call Settings:**
- Ensure number has voice capability
- Check country restrictions (some countries block outbound marketing calls)
- Configure voice webhooks to point to AEVOICE

**Call Recording:**
- Enable in Agent settings (AgentBuilder → Recording tab)
- Recordings stored in Twilio (access via console)
- Additional storage costs apply

### Cost Monitoring

**Twilio Pricing (as of 2024):**
- Voice: ~$0.013-0.02/minute (varies by country)
- SMS: ~$0.0075/message (USA)
- WhatsApp: ~$0.005/message (conversation-based)

**Track Usage:**
- Twilio Console → Usage
- AEVOICE CommunicationUsage table
- Marketing Hub campaign reports

---

## Email Configuration

### Overview

Configure default email settings for marketing campaigns.

### Default From Email

1. Navigate to **Email** tab
2. Enter your sending email address
   ```
   Example: marketing@yourdomain.com
   ```

**Requirements:**
- Must be verified in SendGrid
- Should match your domain's SPF/DKIM records
- Avoid using @gmail.com, @yahoo.com (low deliverability)

### Reply-To Email

1. Enter the email where replies should go
   ```
   Example: support@yourdomain.com
   ```

**Best Practices:**
- Use a monitored inbox
- Set up auto-responders if needed
- Keep separate from no-reply addresses

### Email Authentication (Advanced)

To improve deliverability, configure these DNS records:

**SPF (Sender Policy Framework):**
```
TXT @ "v=spf1 include:sendgrid.net ~all"
```

**DKIM (DomainKeys Identified Mail):**
- Generate DKIM keys in SendGrid
- Add CNAME records to your DNS

**DMARC (Domain-based Message Authentication):**
```
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

See [SendGrid Authentication Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication).

---

## Security Best Practices

### API Key Management

✅ **DO:**
- Rotate keys every 90 days
- Use separate keys for dev/staging/production
- Revoke keys immediately if compromised
- Monitor API usage for anomalies

❌ **DON'T:**
- Share API keys via email or chat
- Commit keys to version control
- Use the same key across multiple apps
- Leave old keys active after rotation

### Webhook Security

✅ **DO:**
- Always use HTTPS endpoints
- Verify webhook signatures
- Implement rate limiting on your endpoint
- Log all webhook events

❌ **DON'T:**
- Use HTTP endpoints (insecure)
- Skip signature verification
- Store webhook secrets in plain text
- Ignore failed webhook deliveries

### Twilio Security

✅ **DO:**
- Use Auth Tokens (never API keys for main account)
- Enable IP whitelisting in Twilio
- Set up fraud alerts
- Monitor usage for unusual patterns

❌ **DON'T:**
- Share Auth Tokens
- Expose credentials in client-side code
- Ignore Twilio security alerts
- Use unverified phone numbers

---

## Troubleshooting

### API Key Issues

**Issue**: "API key invalid"
- **Solution**: Regenerate key in provider dashboard and update in AEVOICE

**Issue**: "Permission denied"
- **Solution**: Ensure API key has required scopes (e.g., SendGrid needs "Mail Send")

### Webhook Issues

**Issue**: "Webhook delivery failed"
- **Solution**: Check endpoint URL is accessible from internet. Verify SSL certificate. Check server logs for errors.

**Issue**: "Signature verification failed"
- **Solution**: Ensure webhook secret matches on both sides. Check payload format.

### Twilio Issues

**Issue**: "Twilio authentication failed"
- **Solution**: Verify Account SID and Auth Token are correct. Check for typos. Ensure not using test credentials in production.

**Issue**: "WhatsApp messages not sending"
- **Solution**: Verify WhatsApp number is approved. Check message template is pre-approved. Ensure recipient has opted in.

**Issue**: "Voice calls failing"
- **Solution**: Check phone number has voice capability. Verify country allows marketing calls. Check Twilio balance.

### Email Issues

**Issue**: "Emails going to spam"
- **Solution**: Configure SPF, DKIM, DMARC records. Warm up your sending IP. Improve content (avoid spam triggers).

**Issue**: "From email not recognized"
- **Solution**: Verify sender email in SendGrid. Authenticate your domain.

---

## Integration Status Dashboard

### Checking Integration Health

Navigate to **Integrations Hub** to see status indicators:

- 🟢 **Active**: Integration configured and working
- 🟡 **Warning**: Integration configured but has issues
- 🔴 **Inactive**: Integration not configured or disabled
- ⚪ **Unknown**: Status cannot be determined

### Testing Integrations

**Send Test Messages:**
1. Go to specific integration tab
2. Click **Test Integration** button
3. Review test results

**Check Logs:**
- View integration logs in Admin Dashboard → Logs
- Filter by integration name
- Look for error codes and messages

---

## Support Resources

### Provider Documentation

- **SendGrid**: [docs.sendgrid.com](https://docs.sendgrid.com)
- **Twilio**: [www.twilio.com/docs](https://www.twilio.com/docs)
- **OpenAI**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Google Cloud**: [cloud.google.com/docs](https://cloud.google.com/docs)

### AEVOICE Support

- **Email**: integrations@aevoice.ai
- **Documentation**: [docs.aevoice.ai/integrations](https://docs.aevoice.ai/integrations)
- **Community Forum**: [community.aevoice.ai](https://community.aevoice.ai)

---

## Appendix: Integration Checklist

Use this checklist when setting up a new AEVOICE account:

- [ ] Create SendGrid account and API key
- [ ] Add SendGrid key to AEVOICE
- [ ] Send test email
- [ ] Create Twilio account
- [ ] Purchase Twilio phone number
- [ ] Add Twilio credentials to AEVOICE
- [ ] Send test SMS
- [ ] Send test WhatsApp message (sandbox)
- [ ] Request WhatsApp production approval (if needed)
- [ ] Create OpenAI account and API key
- [ ] Add OpenAI key to AEVOICE
- [ ] Test AI content generation
- [ ] Configure DNS records (SPF, DKIM, DMARC) for email
- [ ] Set up webhooks for CRM integration (if applicable)
- [ ] Test webhook delivery
- [ ] Import initial contact list
- [ ] Run first test campaign

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Contact**: support@aevoice.ai
