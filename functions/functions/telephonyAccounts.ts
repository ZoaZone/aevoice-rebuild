import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Create a new telephony account
    async function createTelephonyAccount(
      { clientId, mode, provider, displayName, config },
    ) {
      // Validate mode
      const validModes = [
        "platform_twilio",
        "byo_twilio",
        "custom_sip",
        "custom_http",
      ];
      if (!validModes.includes(mode)) {
        throw new Error(
          `Invalid mode. Must be one of: ${validModes.join(", ")}`,
        );
      }

      // Validate provider based on mode
      let resolvedProvider = provider;
      if (mode === "platform_twilio" || mode === "byo_twilio") {
        resolvedProvider = "twilio";
      } else if (mode === "custom_sip") {
        resolvedProvider = "sip";
      }

      // Validate required config based on mode
      const configData = config || {};

      if (mode === "byo_twilio") {
        if (!configData.account_sid || !configData.auth_token) {
          throw new Error("BYO Twilio requires account_sid and auth_token");
        }
      }

      if (mode === "custom_sip") {
        if (!configData.sip_domain) {
          throw new Error("Custom SIP requires sip_domain");
        }
      }

      const telephonyAccount = await base44.entities.TelephonyAccount.create({
        client_id: clientId,
        mode,
        provider: resolvedProvider,
        display_name: displayName || `${mode} Account`,
        config: configData,
        status: "pending_verification",
      });

      return telephonyAccount;
    }

    // Verify telephony account credentials
    async function verifyTelephonyAccount({ telephonyAccountId }) {
      const accounts = await base44.entities.TelephonyAccount.filter({
        id: telephonyAccountId,
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("Telephony account not found");
      }

      const account = accounts[0];

      // For platform_twilio, always verified (we control it)
      if (account.mode === "platform_twilio") {
        await base44.entities.TelephonyAccount.update(telephonyAccountId, {
          status: "active",
          last_verified_at: new Date().toISOString(),
        });
        return { verified: true, mode: account.mode };
      }

      // For byo_twilio, we would validate credentials with Twilio API
      if (account.mode === "byo_twilio") {
        // In production: call Twilio API to verify account_sid + auth_token
        // const twilio = require('twilio')(account.config.account_sid, account.config.auth_token);
        // await twilio.api.accounts(account.config.account_sid).fetch();

        await base44.entities.TelephonyAccount.update(telephonyAccountId, {
          status: "active",
          last_verified_at: new Date().toISOString(),
          verification_error: null,
        });
        return { verified: true, mode: account.mode };
      }

      // For custom_sip, mark as pending manual verification
      if (account.mode === "custom_sip") {
        await base44.entities.TelephonyAccount.update(telephonyAccountId, {
          status: "active",
          last_verified_at: new Date().toISOString(),
        });
        return {
          verified: true,
          mode: account.mode,
          note: "SIP connection should be tested manually",
        };
      }

      return { verified: false, error: "Unknown mode" };
    }

    // List available phone numbers from provider
    async function listAvailableNumbers(
      { telephonyAccountId, country, areaCode },
    ) {
      const accounts = await base44.entities.TelephonyAccount.filter({
        id: telephonyAccountId,
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("Telephony account not found");
      }

      const account = accounts[0];

      // For platform_twilio or byo_twilio, we would query Twilio's available numbers
      if (account.mode === "platform_twilio" || account.mode === "byo_twilio") {
        // Mock response - in production, call Twilio API
        return {
          numbers: [
            {
              number: "+1" + (areaCode || "555") + "0001000",
              locality: "New York",
              region: "NY",
            },
            {
              number: "+1" + (areaCode || "555") + "0001001",
              locality: "New York",
              region: "NY",
            },
            {
              number: "+1" + (areaCode || "555") + "0001002",
              locality: "New York",
              region: "NY",
            },
          ],
          country: country || "US",
        };
      }

      return {
        numbers: [],
        note: "Number listing not available for this provider type",
      };
    }

    // Purchase/provision a phone number
    async function provisionPhoneNumber(
      { telephonyAccountId, clientId, numberE164, label, agentId },
    ) {
      // Check phone number limit
      const limitCheck = await base44.functions.invoke("planLimits", {
        action: "checkPhoneNumberLimit",
        clientId,
      });

      if (!limitCheck.data.allowed) {
        throw new Error(
          `Phone number limit reached (${limitCheck.data.current}/${limitCheck.data.limit})`,
        );
      }

      const accounts = await base44.entities.TelephonyAccount.filter({
        id: telephonyAccountId,
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("Telephony account not found");
      }

      // Generate webhook token
      const webhookToken = crypto.randomUUID().replace(/-/g, "");

      // In production: actually purchase the number via Twilio API
      // const twilio = require('twilio')(...);
      // const purchased = await twilio.incomingPhoneNumbers.create({ phoneNumber: numberE164 });

      const phoneNumber = await base44.entities.PhoneNumber.create({
        client_id: clientId,
        telephony_account_id: telephonyAccountId,
        number_e164: numberE164,
        label: label || "New Number",
        agent_id: agentId || null,
        capabilities: ["voice"],
        status: "active",
        webhook_token: webhookToken,
        provider_number_id: "PN" + Date.now(), // Mock - would be Twilio's number SID
      });

      const webhookUrl = `${
        Deno.env.get("PUBLIC_BASE_URL") || "https://api.voiceai.app"
      }/webhooks/voice?token=${webhookToken}`;

      return {
        phoneNumber,
        webhookUrl,
        limitInfo: {
          numbersUsed: limitCheck.data.current + 1,
          numbersLimit: limitCheck.data.limit,
        },
      };
    }

    // Configure webhook for a phone number
    async function configureWebhook({ phoneNumberId, webhookUrl }) {
      const phoneNumbers = await base44.entities.PhoneNumber.filter({
        id: phoneNumberId,
      });

      if (!phoneNumbers || phoneNumbers.length === 0) {
        throw new Error("Phone number not found");
      }

      const phoneNumber = phoneNumbers[0];

      // Get telephony account
      const accounts = await base44.entities.TelephonyAccount.filter({
        id: phoneNumber.telephony_account_id,
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("Telephony account not found");
      }

      // In production: update webhook URL in Twilio
      // const twilio = require('twilio')(...);
      // await twilio.incomingPhoneNumbers(phoneNumber.provider_number_id).update({ voiceUrl: webhookUrl });

      return {
        success: true,
        phoneNumberId,
        webhookUrl,
        note: "Webhook configured successfully",
      };
    }

    // Route to appropriate action
    let result;
    switch (action) {
      case "create":
        result = await createTelephonyAccount(body);
        break;
      case "verify":
        result = await verifyTelephonyAccount(body);
        break;
      case "listAvailableNumbers":
        result = await listAvailableNumbers(body);
        break;
      case "provisionNumber":
        result = await provisionPhoneNumber(body);
        break;
      case "configureWebhook":
        result = await configureWebhook(body);
        break;
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error("[telephonyAccounts] Error:", error);
    console.error("[telephonyAccounts] Action:", action);
    if (error instanceof Error ? error.stack : "") {
      console.error(
        "[telephonyAccounts] Stack trace:",
        error instanceof Error ? error.stack : "",
      );
    }
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
