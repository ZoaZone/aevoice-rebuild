// components/marketing/services/marketingService.js
import { base44 } from "@/api/base44Client";

// ============================================
// Contact Service
// ============================================
export async function fetchContacts() {
  return base44.entities.MarketingContact.list();
}

export async function createContact(contactData) {
  if (!contactData.email) throw new Error("Email is required");
  return base44.entities.MarketingContact.create(contactData);
}

export async function updateContact(contactId, data) {
  return base44.entities.MarketingContact.update(contactId, data);
}

export async function deleteContact(contactId) {
  return base44.entities.MarketingContact.delete(contactId);
}

export async function bulkUploadContacts(file, clientId) {
  if (!file) throw new Error("File is required");
  if (!clientId) throw new Error("Client ID is required");

  // Upload file
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  // Extract data from file
  const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
    file_url,
    json_schema: {
      type: "object",
      properties: {
        contacts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              phone: { type: "string" },
              full_name: { type: "string" },
              company: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              funnel_stage: { type: "string" }
            }
          }
        }
      }
    }
  });

  if (result.status !== "success" || !result.output?.contacts) {
    throw new Error("Failed to extract contacts from file");
  }

  // Prepare contacts for bulk create
  const contactsToCreate = result.output.contacts.map(contact => ({
    ...contact,
    client_id: clientId,
    source: "bulk_upload",
    status: "active",
    email_subscribed: true,
    whatsapp_subscribed: !!contact.phone,
    funnel_stage: contact.funnel_stage || "lead"
  }));

  await base44.entities.MarketingContact.bulkCreate(contactsToCreate);
  return { count: contactsToCreate.length, contacts: contactsToCreate };
}

// ============================================
// Campaign Service
// ============================================
export async function fetchCampaigns() {
  return base44.entities.MarketingCampaign.list();
}

export async function createCampaign(campaignData) {
  // Validation
  if (!campaignData.name?.trim()) throw new Error("Campaign name is required");
  if (!campaignData.type) throw new Error("Campaign type is required");
  if (campaignData.type === "email" && !campaignData.from_email) {
    throw new Error("From email is required for email campaigns");
  }
  if (campaignData.type === "voice_call" && !campaignData.agent_id) {
    throw new Error("AI Agent is required for voice campaigns");
  }
  if ((campaignData.type === "whatsapp" || campaignData.type === "voice_call") && !campaignData.phone_number_id) {
    throw new Error("Phone number is required for WhatsApp/Voice campaigns");
  }

  return base44.entities.MarketingCampaign.create({
    ...campaignData,
    status: campaignData.status || "draft"
  });
}

export async function updateCampaign(campaignId, data) {
  return base44.entities.MarketingCampaign.update(campaignId, data);
}

export async function deleteCampaign(campaignId) {
  return base44.entities.MarketingCampaign.delete(campaignId);
}

// ============================================
// Workflow Service
// ============================================
export async function fetchWorkflows() {
  return base44.entities.MarketingWorkflow.list();
}

export async function createWorkflow(workflowData) {
  if (!workflowData.name?.trim()) throw new Error("Workflow name is required");
  if (!workflowData.actions?.length) throw new Error("At least one action is required");
  
  return base44.entities.MarketingWorkflow.create(workflowData);
}

export async function updateWorkflow(workflowId, data) {
  return base44.entities.MarketingWorkflow.update(workflowId, data);
}

export async function deleteWorkflow(workflowId) {
  return base44.entities.MarketingWorkflow.delete(workflowId);
}

// ============================================
// Integration Config Service
// ============================================
export async function fetchIntegrations() {
  return base44.entities.IntegrationConfig.list();
}

export async function saveGoogleApiKey(apiKey, clients, integrations) {
  if (!apiKey?.trim()) throw new Error("API key is required");
  
  const client = clients[0];
  if (!client) throw new Error("No client found");

  const existingConfig = integrations.find(i => i.provider === "google_ai");

  if (existingConfig) {
    return base44.entities.IntegrationConfig.update(existingConfig.id, {
      config: { ...existingConfig.config, api_key: apiKey }
    });
  } else {
    return base44.entities.IntegrationConfig.create({
      agency_id: client.agency_id,
      integration_type: "custom_api",
      provider: "google_ai",
      name: "Google AI (Veo)",
      config: { api_key: apiKey },
      enabled: true,
      status: "active"
    });
  }
}

// ============================================
// AI Content Generation
// ============================================
export async function generateAIContent(campaignType, prompt, googleAiConfigured) {
  if (!prompt?.trim()) throw new Error("AI prompt is required");

  if (campaignType === "video") {
    if (!googleAiConfigured) {
      throw new Error("Please configure your Google AI API key first");
    }

    const videoResponse = await base44.functions.invoke("generateVideo", {
      prompt,
      duration: 30
    });

    if (videoResponse.data?.error) {
      throw new Error(videoResponse.data.message || "Video generation failed");
    }

    return {
      subject: "",
      body: prompt,
      media_url: videoResponse.data?.video_url || null,
      cta_text: "Watch Now",
      cta_url: ""
    };
  }

  // Text content generation
  const contentResult = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a professional marketing copywriter. Generate compelling ${campaignType} marketing content.

Campaign details: ${prompt}

Create engaging, professional content that drives action. Be creative and persuasive.

Return ONLY valid JSON (no markdown, no code blocks) with these fields:
- subject: catchy subject line (for email) or title
- body: full marketing message (use HTML for email, plain text for WhatsApp)
- cta_text: call-to-action button text
- cta_url: suggested URL for the CTA`,
    response_json_schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Catchy subject line or title" },
        body: { type: "string", description: "Full marketing message content" },
        cta_text: { type: "string", description: "Call to action button text" },
        cta_url: { type: "string", description: "URL for the call to action" }
      },
      required: ["subject", "body", "cta_text"]
    }
  });

  return contentResult;
}

// ============================================
// Campaign Sending
// ============================================
export async function sendEmailCampaign(campaign, draftContent, contacts, fromEmail) {
  const emailContacts = contacts.filter(c => c.email_subscribed && c.email);
  if (emailContacts.length === 0) {
    throw new Error("No email subscribers found");
  }

  let sentCount = 0;
  let failCount = 0;

  for (const contact of emailContacts) {
    try {
      await base44.functions.invoke("sendMarketingEmail", {
        to: contact.email,
        subject: draftContent.subject,
        body: draftContent.body,
        from_email: fromEmail,
        contact_id: contact.id,
        cta_text: draftContent.cta_text,
        cta_url: draftContent.cta_url
      });
      sentCount++;
    } catch (err) {
      console.error("Email send error:", err);
      failCount++;
    }
  }

  // Update campaign status
  await base44.entities.MarketingCampaign.update(campaign.id, {
    status: "completed",
    stats: { sent: sentCount, failed: failCount, total: emailContacts.length }
  });

  return { sentCount, failCount, total: emailContacts.length };
}

export async function sendWhatsAppCampaign(campaignId, message, phoneNumberId, contacts) {
  const whatsappContacts = contacts.filter(c => c.whatsapp_subscribed && c.phone);
  if (whatsappContacts.length === 0) {
    throw new Error("No WhatsApp subscribers found");
  }

  const contactIds = whatsappContacts.map(c => c.id);

  const result = await base44.functions.invoke("sendWhatsAppCampaign", {
    campaign_id: campaignId,
    message,
    phone_number_id: phoneNumberId,
    contact_ids: contactIds
  });

  if (!result.data.success) {
    throw new Error(result.data.error || "Campaign send failed");
  }

  return { sentCount: result.data.sent_count, total: whatsappContacts.length };
}

// ============================================
// Other Data Fetches
// ============================================
export async function fetchClients() {
  return base44.entities.Client.list();
}

export async function fetchAgents() {
  return base44.entities.Agent.list();
}

export async function fetchPhoneNumbers() {
  return base44.entities.PhoneNumber.list();
}