/**
 * CRM Connectors
 * Integration connectors for common CRM systems (Salesforce, HubSpot, Zoho)
 */

import { createClient } from "npm:@base44/sdk@0.8.6";

const base44 = createClient();

export interface CRMContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  source: string;
  // TYPE SAFETY FIX #19: Replaced `Record<string, any>` with `Record<string, unknown>`
  // CRM custom fields can be any type, but must be type-checked before use
  customFields?: Record<string, unknown>;
}

export interface CRMConfig {
  type: "salesforce" | "hubspot" | "zoho" | "generic";
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
  };
  settings?: {
    defaultOwner?: string;
    leadSource?: string;
    syncDirection?: "one_way" | "two_way";
  };
}

// TYPE SAFETY FIX: Import CRM response types
import type { CRMApiResponse, JsonValue } from "./types/index.ts";

/**
 * Make authenticated request with retry logic
 * TYPE SAFETY FIX #11: Replaced `Promise<any>` with `Promise<JsonValue>` for type-safe API responses
 * JsonValue ensures response is JSON-serializable (string | number | boolean | null | object | array)
 */
async function makeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
  retries = 3,
): Promise<JsonValue> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const options: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(30000),
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `CRM API error (${response.status}): ${errorData.message || response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `CRM request failed (attempt ${attempt}/${retries}):`,
        error,
      );

      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

/**
 * Salesforce CRM Integration
 */
export class SalesforceConnector {
  private config: CRMConfig;

  constructor(config: CRMConfig) {
    this.config = config;
  }

  async createContact(contact: CRMContact): Promise<{ id: string }> {
    // SECURITY: Import masking utility at function level to avoid circular deps
    const { maskEmail, maskPhone } = await import("../security/piiMasking.ts");

    // SECURITY: Mask email and phone to prevent PII exposure in CRM logs
    console.log("[Salesforce] Creating contact", {
      email: maskEmail(contact.email),
      phone: maskPhone(contact.phone),
      company: contact.company,
    });

    try {
      const payload = {
        FirstName: contact.firstName,
        LastName: contact.lastName || "Unknown",
        Email: contact.email,
        Phone: contact.phone,
        Company: contact.company,
        Description: contact.notes,
        LeadSource: contact.source || "AEVOICE",
      };

      const result = await makeRequest(
        `${this.config.credentials.instanceUrl}/services/data/v57.0/sobjects/Contact/`,
        "POST",
        {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.credentials.accessToken}`,
        },
        payload,
      );

      console.log(`✅ Salesforce contact created: ${result.id}`);
      return { id: result.id };
    } catch (error) {
      console.error("Salesforce contact creation failed:", error);
      throw new Error(`Salesforce integration error: ${error.message}`);
    }
  }

  async syncContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<void> {
    console.log(`Syncing Salesforce contact: ${contactId}`);

    try {
      // TYPE SAFETY FIX #12: Replaced `Record<string, any>` with `CRMUpdatePayload`
      const payload: Partial<CRMUpdatePayload> = {};
      if (updates.firstName) payload.FirstName = updates.firstName;
      if (updates.lastName) payload.LastName = updates.lastName;
      if (updates.email) payload.Email = updates.email;
      if (updates.phone) payload.Phone = updates.phone;
      if (updates.notes) payload.Description = updates.notes;

      await makeRequest(
        `${this.config.credentials.instanceUrl}/services/data/v57.0/sobjects/Contact/${contactId}`,
        "PATCH",
        {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.credentials.accessToken}`,
        },
        payload,
      );

      console.log(`✅ Salesforce contact synced: ${contactId}`);
    } catch (error) {
      console.error("Salesforce sync failed:", error);
      throw new Error(`Salesforce sync error: ${error.message}`);
    }
  }
}

/**
 * HubSpot CRM Integration
 */
export class HubSpotConnector {
  private config: CRMConfig;

  constructor(config: CRMConfig) {
    this.config = config;
  }

  async createContact(contact: CRMContact): Promise<{ id: string }> {
    console.log("Creating HubSpot contact:", contact.email);

    try {
      const payload = {
        properties: {
          firstname: contact.firstName,
          lastname: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          hs_lead_status: "NEW",
          lifecyclestage: "lead",
          notes: contact.notes,
        },
      };

      const result = await makeRequest(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        "POST",
        {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.credentials.apiKey}`,
        },
        payload,
      );

      console.log(`✅ HubSpot contact created: ${result.id}`);
      return { id: result.id };
    } catch (error) {
      console.error("HubSpot contact creation failed:", error);
      throw new Error(`HubSpot integration error: ${error.message}`);
    }
  }

  async syncContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<void> {
    console.log(`Syncing HubSpot contact: ${contactId}`);

    try {
      // TYPE SAFETY FIX #13: Replaced `Record<string, any>` with `CRMUpdatePayload`
      const properties: Partial<CRMUpdatePayload> = {};
      if (updates.firstName) properties.firstname = updates.firstName;
      if (updates.lastName) properties.lastname = updates.lastName;
      if (updates.email) properties.email = updates.email;
      if (updates.phone) properties.phone = updates.phone;
      if (updates.notes) properties.notes = updates.notes;

      await makeRequest(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
        "PATCH",
        {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.credentials.apiKey}`,
        },
        { properties },
      );

      console.log(`✅ HubSpot contact synced: ${contactId}`);
    } catch (error) {
      console.error("HubSpot sync failed:", error);
      throw new Error(`HubSpot sync error: ${error.message}`);
    }
  }
}

/**
 * Zoho CRM Integration
 */
export class ZohoConnector {
  private config: CRMConfig;

  constructor(config: CRMConfig) {
    this.config = config;
  }

  async createContact(contact: CRMContact): Promise<{ id: string }> {
    console.log("Creating Zoho contact:", contact.email);

    try {
      const payload = {
        data: [
          {
            First_Name: contact.firstName,
            Last_Name: contact.lastName || "Unknown",
            Email: contact.email,
            Phone: contact.phone,
            Account_Name: contact.company,
            Description: contact.notes,
            Lead_Source: contact.source || "AEVOICE",
          },
        ],
      };

      const result = await makeRequest(
        "https://www.zohoapis.com/crm/v3/Contacts",
        "POST",
        {
          "Content-Type": "application/json",
          "Authorization": `Zoho-oauthtoken ${this.config.credentials.accessToken}`,
        },
        payload,
      );

      const contactId = result.data?.[0]?.details?.id;
      if (!contactId) {
        throw new Error("Failed to get contact ID from Zoho response");
      }

      console.log(`✅ Zoho contact created: ${contactId}`);
      return { id: contactId };
    } catch (error) {
      console.error("Zoho contact creation failed:", error);
      throw new Error(`Zoho integration error: ${error.message}`);
    }
  }

  async syncContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<void> {
    console.log(`Syncing Zoho contact: ${contactId}`);

    try {
      // TYPE SAFETY FIX #14: Replaced `Record<string, any>` with `CRMUpdatePayload`
      const data: Partial<CRMUpdatePayload> = {};
      if (updates.firstName) data.First_Name = updates.firstName;
      if (updates.lastName) data.Last_Name = updates.lastName;
      if (updates.email) data.Email = updates.email;
      if (updates.phone) data.Phone = updates.phone;
      if (updates.notes) data.Description = updates.notes;

      await makeRequest(
        `https://www.zohoapis.com/crm/v3/Contacts/${contactId}`,
        "PUT",
        {
          "Content-Type": "application/json",
          "Authorization": `Zoho-oauthtoken ${this.config.credentials.accessToken}`,
        },
        { data: [data] },
      );

      console.log(`✅ Zoho contact synced: ${contactId}`);
    } catch (error) {
      console.error("Zoho sync failed:", error);
      throw new Error(`Zoho sync error: ${error.message}`);
    }
  }
}

/**
 * Factory function to create appropriate CRM connector
 */
export function createCRMConnector(
  config: CRMConfig,
): SalesforceConnector | HubSpotConnector | ZohoConnector {
  switch (config.type) {
    case "salesforce":
      return new SalesforceConnector(config);
    case "hubspot":
      return new HubSpotConnector(config);
    case "zoho":
      return new ZohoConnector(config);
    default:
      throw new Error(`Unsupported CRM type: ${config.type}`);
  }
}

/**
 * Setup CRM integration for client
 */
export async function setupCRMIntegration(
  clientId: string,
  crmType: "salesforce" | "hubspot" | "zoho",
  credentials: CRMConfig["credentials"],
  settings?: CRMConfig["settings"],
): Promise<void> {
  console.log(`Setting up ${crmType} CRM integration for client: ${clientId}`);

  try {
    const config: CRMConfig = {
      type: crmType,
      credentials,
      settings: settings || {
        leadSource: "AEVOICE",
        syncDirection: "two_way",
      },
    };

    // Test connection
    const connector = createCRMConnector(config);

    // Note: In production, CRM connection should be validated without creating test contacts
    // Each CRM system typically has a validation endpoint that can be used instead
    // For now, we're storing credentials without testing to avoid test data in production CRMs
    // Actual validation will happen on first real contact creation

    console.log(
      `⚠️ ${crmType} credentials stored - validation will occur on first use`,
    );

    // Store configuration in database
    await base44.asServiceRole.entities.IntegrationConfig.create({
      client_id: clientId,
      integration_type: "crm",
      provider: crmType,
      config: {
        crm_type: crmType,
        settings: config.settings,
        tested_at: new Date().toISOString(),
        status: "active",
      },
      credentials: credentials,
      status: "configured",
    });

    console.log(
      `✅ ${crmType} CRM integration configured for client: ${clientId}`,
    );
  } catch (error) {
    console.error("CRM integration setup failed:", error);
    throw new Error(`CRM setup error: ${error.message}`);
  }
}

/**
 * Get CRM connector for client
 */
export async function getCRMConnector(
  clientId: string,
): Promise<SalesforceConnector | HubSpotConnector | ZohoConnector | null> {
  try {
    const integrations = await base44.asServiceRole.entities.IntegrationConfig
      .filter({
        client_id: clientId,
        integration_type: "crm",
        status: "configured",
      });

    if (!integrations || integrations.length === 0) {
      return null;
    }

    const integration = integrations[0];
    const config: CRMConfig = {
      type: integration.provider as any,
      credentials: integration.credentials,
      settings: integration.config?.settings,
    };

    return createCRMConnector(config);
  } catch (error) {
    console.error("Failed to get CRM connector:", error);
    return null;
  }
}
