/**
 * Bulk upload marketing contacts from CSV/Excel files
 *
 * @route POST /functions/bulkUploadContacts
 * @auth Required - User must own the client
 * @body { file_url, client_id, consent_type }
 * @returns { success: true, contacts_created, contacts_skipped, errors }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { file_url, client_id, consent_type = "all" } = await req.json();

    if (!file_url || !client_id) {
      return Response.json(
        { error: "file_url and client_id are required" },
        { status: 400 },
      );
    }

    logger.info("Bulk contact upload started", {
      request_id: requestId,
      client_id,
      user_email: user.email,
    });

    // Extract data from uploaded file
    const extractResult = await base44.integrations.Core
      .ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              description: "List of contacts from the file",
              items: {
                type: "object",
                properties: {
                  email: { type: "string", description: "Email address" },
                  phone: {
                    type: "string",
                    description: "Phone number with country code",
                  },
                  full_name: {
                    type: "string",
                    description: "Full name of the contact",
                  },
                  first_name: { type: "string", description: "First name" },
                  last_name: { type: "string", description: "Last name" },
                  company: { type: "string", description: "Company name" },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags or categories for this contact",
                  },
                  funnel_stage: {
                    type: "string",
                    description: "Sales funnel stage (lead, prospect, customer, churned)",
                  },
                  twitter_handle: {
                    type: "string",
                    description: "Twitter handle",
                  },
                  linkedin_url: {
                    type: "string",
                    description: "LinkedIn profile URL",
                  },
                  facebook_url: {
                    type: "string",
                    description: "Facebook profile URL",
                  },
                  notes: { type: "string", description: "Additional notes" },
                },
              },
            },
          },
        },
      });

    if (extractResult.status !== "success" || !extractResult.output?.contacts) {
      logger.error("File extraction failed", {
        request_id: requestId,
        result: extractResult,
      });
      return Response.json(
        {
          error:
            "Failed to extract contacts from file. Please ensure the file is a valid CSV or Excel file.",
        },
        { status: 400 },
      );
    }

    const contacts = extractResult.output.contacts;
    logger.info("Contacts extracted from file", {
      request_id: requestId,
      count: contacts.length,
    });

    // Validate and prepare contacts for insertion
    const now = new Date().toISOString();
    let contactsCreated = 0;
    let contactsSkipped = 0;
    const errors = [];

    for (const contact of contacts) {
      // Validate minimum requirements
      if (!contact.email && !contact.phone) {
        contactsSkipped++;
        errors.push(
          `Skipped contact: missing both email and phone - ${contact.full_name || "Unknown"}`,
        );
        continue;
      }

      try {
        // Check for duplicates
        const existingContacts = await base44.asServiceRole.entities
          .MarketingContact.filter({
            client_id,
            ...(contact.email ? { email: contact.email } : {}),
          });

        if (existingContacts.length > 0) {
          contactsSkipped++;
          logger.info("Duplicate contact skipped", {
            request_id: requestId,
            email: contact.email,
          });
          continue;
        }

        // Build social handles object
        const social_handles: Record<string, string> = {};
        if (contact.twitter_handle) {
          social_handles.twitter = contact.twitter_handle;
        }
        if (contact.linkedin_url) {
          social_handles.linkedin = contact.linkedin_url;
        }
        if (contact.facebook_url) {
          social_handles.facebook = contact.facebook_url;
        }

        // Determine consent based on consent_type parameter
        const email_subscribed = consent_type === "all" ||
          consent_type === "email";
        const whatsapp_subscribed = (consent_type === "all" || consent_type === "whatsapp") &&
          !!contact.phone;
        const sms_subscribed = (consent_type === "all" || consent_type === "sms") &&
          !!contact.phone;
        const voice_subscribed = (consent_type === "all" || consent_type === "voice") &&
          !!contact.phone;

        // Create contact
        await base44.asServiceRole.entities.MarketingContact.create({
          client_id,
          email: contact.email || null,
          phone: contact.phone || null,
          full_name: contact.full_name ||
            (contact.first_name && contact.last_name
              ? `${contact.first_name} ${contact.last_name}`
              : contact.first_name || contact.last_name || null),
          company: contact.company || null,
          tags: contact.tags || [],
          funnel_stage: contact.funnel_stage || "lead",
          social_handles,
          source: "bulk_upload",
          status: "active",

          // Consent fields
          email_subscribed,
          email_consent_date: email_subscribed ? now : null,
          whatsapp_subscribed,
          whatsapp_consent_date: whatsapp_subscribed ? now : null,
          sms_subscribed,
          sms_consent_date: sms_subscribed ? now : null,
          voice_subscribed,
          voice_consent_date: voice_subscribed ? now : null,

          engagement_score: 0,
          created_by: user.id,
          created_at: now,
          updated_at: now,
        });

        contactsCreated++;
      } catch (error) {
        contactsSkipped++;
        errors.push(
          `Failed to create contact ${contact.email || contact.phone}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        logger.error("Contact creation failed", {
          request_id: requestId,
          contact: contact.email || contact.phone,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Bulk contact upload completed", {
      request_id: requestId,
      contacts_created: contactsCreated,
      contacts_skipped: contactsSkipped,
      errors_count: errors.length,
    });

    return Response.json({
      success: true,
      contacts_created: contactsCreated,
      contacts_skipped: contactsSkipped,
      total_processed: contacts.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    logger.error("Bulk contact upload failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });

    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
});
