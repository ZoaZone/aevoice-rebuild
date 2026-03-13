import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { maskEmail, maskName } from "./lib/security/piiMasking.ts";

Deno.serve(async (req) => {
  // SECURITY: Generate requestId for correlation without exposing PII
  const requestId = crypto.randomUUID();
  const base44 = createClientFromRequest(req);

  // ---------------------------
  // 1. Parse JSON safely
  // ---------------------------
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  console.log("[ONBOARDING] Received body", { request_id: requestId });

  const code = (body.code || "").toUpperCase().trim();
  const business_name = (body.business_name || body.businessName || "").trim();
  let website = (body.website || "").trim();

  // Auto-fix website URL - add https:// if missing protocol
  if (website && !website.match(/^https?:\/\//i)) {
    website = `https://${website.replace(/^(www\.)?/i, "")}`;
  }

  // SECURITY: Mask business name to prevent PII exposure
  console.log(
    "[ONBOARDING] Parsed",
    {
      request_id: requestId,
      code,
      business_name: maskName(business_name),
      website,
    },
  );

  if (!business_name) {
    return Response.json(
      { success: false, error: "Business name is required" },
      { status: 400 },
    );
  }

  // ---------------------------
  // 2. Authenticate user
  // ---------------------------
  let user;
  try {
    user = await base44.auth.me();
  } catch {
    return Response.json(
      {
        success: false,
        error: "Please sign in first to activate your account.",
      },
      { status: 401 },
    );
  }

  if (!user || !user.email) {
    return Response.json(
      {
        success: false,
        error: "Please sign in first to activate your account",
      },
      { status: 401 },
    );
  }

  const userEmail = user.email.toLowerCase();
  // SECURITY: Mask email to prevent PII exposure in authentication logs
  console.log("[ONBOARDING] User authenticated", {
    request_id: requestId,
    email: maskEmail(userEmail),
  });

  // ---------------------------
  // 3. Check if client already exists
  // ---------------------------
  let existingClients = [];
  try {
    existingClients = await base44.asServiceRole.entities.Client.filter({
      contact_email: userEmail,
    });
  } catch (err) {
    console.error("[ONBOARDING] Error checking existing clients", {
      request_id: requestId,
      error: err.message,
    });
    existingClients = [];
  }

  if (existingClients && existingClients.length > 0) {
    // User already has a client - update their user data with client_id
    try {
      await base44.auth.updateMe({ client_id: existingClients[0].id });
      console.log(
        "[ONBOARDING] Updated user with existing client_id",
        { request_id: requestId, client_id: existingClients[0].id },
      );
    } catch (e) {
      console.error(
        "[ONBOARDING] Failed to update user with existing client_id:",
        e,
      );
    }
    return Response.json({
      success: true,
      client_id: existingClients[0].id,
      message: "Account already activated",
    });
  }

  // ---------------------------
  // 4. Validate invitation code (COMPLETELY OPTIONAL)
  // ---------------------------
  let invite = null;

  if (code && code.length > 0) {
    // SECURITY: Only log code length, not actual code
    console.log("[ONBOARDING] Checking invitation code", {
      request_id: requestId,
      code_length: code.length,
    });

    try {
      const invites = await base44.asServiceRole.entities.Invitation.filter({
        code,
      });

      if (invites && invites.length > 0) {
        invite = invites[0];
        const now = new Date();
        const expiresAt = invite.expires_at
          ? new Date(invite.expires_at)
          : new Date(Date.now() + 86400000);

        // Soft validation - don't block, just don't apply benefits if invalid
        if (
          now > expiresAt || invite.status === "used" ||
          invite.status !== "pending"
        ) {
          console.log(
            "[ONBOARDING] Invitation invalid/expired, proceeding as regular signup",
            { request_id: requestId },
          );
          invite = null;
        } else if (invite.email && invite.email.toLowerCase() !== userEmail) {
          console.log(
            "[ONBOARDING] Email mismatch, proceeding as regular signup",
            { request_id: requestId },
          );
          invite = null;
        } else {
          console.log(
            "[ONBOARDING] Valid invitation found, applying benefits",
            { request_id: requestId },
          );
        }
      }
    } catch (err) {
      console.log(
        "[ONBOARDING] Code lookup failed, proceeding as regular signup",
        { request_id: requestId },
      );
    }
  }

  // No code required - anyone can sign up
  console.log(
    "[ONBOARDING] Proceeding with account creation, invite benefits:",
    invite ? "YES" : "NO",
  );

  // ---------------------------
  // 5. Create Client
  // ---------------------------
  const slug = business_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") + `-${Date.now().toString().slice(-5)}`;

  let client;

  try {
    client = await base44.asServiceRole.entities.Client.create({
      name: business_name,
      slug,
      contact_email: userEmail,
      account_type: invite?.account_type || "business",
      category: invite?.category || "General",
      onboarding_status: "completed",
      industry: invite?.category || "other",
      status: "active",
      created_by: userEmail,
      settings: {
        website,
        invited_via: code || null,
        activated_at: new Date().toISOString(),
      },
    });
    console.log("[ONBOARDING] Client created:", client.id);
  } catch (err) {
    console.error("[ONBOARDING] Failed to create client:", err);
    return Response.json(
      { success: false, error: "Failed to create client" },
      { status: 500 },
    );
  }

  // ---------------------------
  // 6. CRITICAL: Update user data with client_id
  // ---------------------------
  try {
    await base44.auth.updateMe({ client_id: client.id });
    console.log("[ONBOARDING] Updated user with client_id:", client.id);
  } catch (err) {
    console.error("[ONBOARDING] Failed to update user with client_id:", err);
  }

  // ---------------------------
  // 7. Mark invite as used (if code was provided)
  // ---------------------------
  if (code && invite) {
    try {
      await base44.asServiceRole.entities.Invitation.update(invite.id, {
        status: "used",
      });
      console.log("[ONBOARDING] Invitation marked as used");
    } catch (err) {
      console.error("[ONBOARDING] Failed to mark invitation as used:", err);
    }
  }

  // ---------------------------
  // 8. Trigger auto-training from website (async, non-blocking)
  // ---------------------------
  if (website && website.trim()) {
    try {
      console.log(
        "[ONBOARDING] Triggering auto-training for website:",
        website,
      );
      base44.asServiceRole.functions.invoke("autoLearnWebsite", {
        website_url: website,
        client_id: client.id,
        max_pages: 10,
      }).catch((err) => console.error("[ONBOARDING] Auto-training failed:", err));
    } catch (err) {
      console.error("[ONBOARDING] Auto-training trigger error:", err);
    }
  }

  // ---------------------------
  // 9. Create Wallet + KB
  // ---------------------------
  try {
    const startingCredits = invite?.account_type === "free_partner" ? 100 : 50;

    await base44.asServiceRole.entities.Wallet.create({
      owner_type: "client",
      owner_id: client.id,
      credits_balance: startingCredits,
      currency: "USD",
      low_balance_threshold: 10,
      auto_recharge: {
        enabled: false,
        threshold: 10,
        amount: 50,
      },
      created_by: userEmail,
    });

    await base44.asServiceRole.entities.KnowledgeBase.create({
      client_id: client.id,
      name: `${business_name} Knowledge Base`,
      description: `Knowledge base for ${business_name}`,
      type: "mixed",
      status: "active",
      shared_with_sri: true,
      chunk_count: 0,
      total_words: 0,
      created_by: userEmail,
    });

    console.log("[ONBOARDING] Wallet and KnowledgeBase created");
  } catch (err) {
    console.error("[ONBOARDING] Failed to create Wallet/KB:", err);
    // Rollback: deactivate client
    await base44.asServiceRole.entities.Client.update(client.id, {
      status: "error",
    });

    return Response.json(
      {
        success: false,
        error: "Account created but failed to initialize resources.",
      },
      { status: 500 },
    );
  }

  // ---------------------------
  // 10. Success
  // ---------------------------
  console.log("[ONBOARDING] Success! client_id:", client.id);
  return Response.json({
    success: true,
    client_id: client.id,
    message: "Account activated successfully!",
  });
});
