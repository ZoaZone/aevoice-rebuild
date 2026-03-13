import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * inviteFreePartner — SINGLE ENTRY POINT for free partner onboarding.
 *
 * Creates (idempotently):
 *  1. Agency  (free-partners)
 *  2. Client  (account_type=free_partner)
 *  3. Subscription (free-partner plan)
 *  4. Wallet  (unlimited credits)
 *  5. KnowledgeBase (standalone — NOT linked to agent)
 *  6. Agent   (no knowledge_base_ids)
 *  7. Platform invite  (admin role)
 *  8. Welcome email
 *
 * Every step is guarded: if the record already exists it is reused, not duplicated.
 */

// ─── helpers ───────────────────────────────────────────────────

function slugify(text, maxLen = 30) {
  return (text || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, maxLen);
}

async function findOrCreateAgency(base44) {
  const slug = "free-partners";
  const rows = await base44.asServiceRole.entities.Agency.filter({ slug });
  if (rows.length) return rows[0];
  return base44.asServiceRole.entities.Agency.create({
    name: "AEVOICE Free Partners",
    slug,
    primary_email: "partners@aevoice.ai",
    status: "active",
    settings: { auto_created: true },
  });
}

async function findOrCreateClient(base44, agencyId, p) {
  const found = await base44.asServiceRole.entities.Client.filter({ contact_email: p.email });
  if (found.length) {
    const c = found[0];
    const updates = {};
    if (c.account_type !== "free_partner") updates.account_type = "free_partner";
    if (!c.agency_id && agencyId) updates.agency_id = agencyId;
    if (!c.display_id || /^[a-f0-9]{24}$/.test(c.display_id)) {
      updates.display_id = slugify(p.business_name || p.name || p.email.split("@")[0]) + "-01";
    }
    if (Object.keys(updates).length) {
      await base44.asServiceRole.entities.Client.update(c.id, updates);
      console.log("[inviteFP] patched client", Object.keys(updates));
    }
    return { ...c, ...updates };
  }
  const base = p.business_name || p.name || p.email.split("@")[0];
  const s = slugify(base) + "-01";
  return base44.asServiceRole.entities.Client.create({
    agency_id: agencyId,
    name: base,
    slug: s,
    display_id: s,
    industry: p.industry || "other",
    contact_email: p.email,
    contact_name: p.name || p.email,
    status: "active",
    account_type: "free_partner",
    onboarding_status: "completed",
    settings: { unlimited_usage: true, plan_type: "unlimited_free" },
  });
}

async function findOrCreateSubscription(base44, clientId) {
  const existing = await base44.asServiceRole.entities.Subscription.filter({ client_id: clientId, status: "active" });
  if (existing.length) return existing[0];
  // ensure plan exists
  let plans = await base44.asServiceRole.entities.Plan.filter({ slug: "free-partner" });
  if (!plans.length) {
    plans = [await base44.asServiceRole.entities.Plan.create({
      name: "Free Partner", slug: "free-partner", description: "Unlimited access for approved free partners",
      plan_type: "client", tier: "custom", price_monthly: 0, is_active: true, is_public: false,
      features: { white_label: true, api_access: true, analytics_advanced: true },
    })];
  }
  const now = new Date();
  const end = new Date(now); end.setFullYear(now.getFullYear() + 1);
  return base44.asServiceRole.entities.Subscription.create({
    client_id: clientId, plan_id: plans[0].id, status: "active",
    billing_cycle: "monthly", current_period_start: now.toISOString(), current_period_end: end.toISOString(),
  });
}

async function findOrCreateWallet(base44, clientId, contactEmail) {
  const existing = await base44.asServiceRole.entities.Wallet.filter({ owner_id: clientId });
  if (existing.length) return existing[0];
  return base44.asServiceRole.entities.Wallet.create({
    owner_type: "client", owner_id: clientId,
    credits_balance: 999999, currency: "USD",
    created_by: contactEmail,
  });
}

async function findOrCreateKB(base44, clientId, businessName) {
  const existing = await base44.asServiceRole.entities.KnowledgeBase.filter({ client_id: clientId });
  if (existing.length) return existing[0];
  return base44.asServiceRole.entities.KnowledgeBase.create({
    client_id: clientId,
    name: `${businessName} Knowledge Base`,
    description: "Auto-created during free partner onboarding",
    type: "mixed",
    status: "active",
    chunk_count: 0,
  });
}

async function findOrCreateAgent(base44, clientId, p) {
  const existing = await base44.asServiceRole.entities.Agent.filter({ client_id: clientId });
  if (existing.length) return existing[0];
  const name = `${p.business_name || p.name || "AI"} Assistant`;
  const displayId = slugify(name) + "-01";
  return base44.asServiceRole.entities.Agent.create({
    client_id: clientId,
    display_id: displayId,
    name,
    description: `Free Partner AI Agent for ${p.business_name || p.name}`,
    agent_type: "receptionist",
    system_prompt: `You are a professional AI assistant for ${p.business_name || p.name}.\nIndustry: ${p.industry || "general"}\nBe helpful, concise, and professional.`,
    greeting_message: `Hello! Welcome to ${p.business_name || p.name}. How can I help you today?`,
    voice_provider: "elevenlabs",
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    language: "en-US",
    auto_language_detection: true,
    status: "active",
    // NOTE: knowledge_base_ids intentionally left empty — KB is not attached to agent
  });
}

// ─── main handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });

    const body = await req.json();
    const p = {
      email: body.email,
      name: body.name,
      business_name: body.business_name,
      industry: body.industry,
      website: body.website,
    };
    if (!p.email) return Response.json({ error: "Missing 'email'" }, { status: 400 });

    console.log(`[inviteFP] start for ${p.email}`);

    // 1 — Agency
    const agency = await findOrCreateAgency(base44);
    console.log(`[inviteFP] agency ${agency.id}`);

    // 2 — Client
    const client = await findOrCreateClient(base44, agency.id, p);
    console.log(`[inviteFP] client ${client.id}`);

    // 3 — Subscription
    const sub = await findOrCreateSubscription(base44, client.id);
    console.log(`[inviteFP] subscription ${sub.id}`);

    // 4 — Wallet
    const wallet = await findOrCreateWallet(base44, client.id, p.email);
    console.log(`[inviteFP] wallet ${wallet.id}`);

    // 5 — Knowledge Base (standalone, not attached to agent)
    const kb = await findOrCreateKB(base44, client.id, p.business_name || p.name || p.email);
    console.log(`[inviteFP] kb ${kb.id}`);

    // 6 — Agent (no KB attached)
    const agent = await findOrCreateAgent(base44, client.id, p);
    console.log(`[inviteFP] agent ${agent.id}`);

    // 7 — Platform invite
    try {
      await base44.users.inviteUser(p.email, "admin");
      console.log(`[inviteFP] invite sent`);
    } catch (invErr) {
      console.warn(`[inviteFP] invite warning: ${invErr.message}`);
    }

    // 8 — Welcome email
    const dashboardUrl = "https://aevoice.base44.app/dashboard";
    const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0e4166,#1a5a8a);padding:30px;text-align:center;border-radius:8px 8px 0 0}.header h1{color:white;margin:0}.content{background:#fff;padding:30px;border:1px solid #e5e5e5}.highlight-box{background:#f0f9ff;border-left:4px solid #0e4166;padding:20px;margin:20px 0}.features{list-style:none;padding:0}.features li{padding:8px 0;border-bottom:1px solid #eee}.features li:before{content:"✓ ";color:#0e4166;font-weight:bold}.button{display:inline-block;background:#0e4166;color:white!important;padding:15px 30px;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0}.footer{text-align:center;padding:20px;color:#999;font-size:12px}</style></head><body><div class="header"><h1>Welcome to AEVOICE! 🎉</h1><p style="color:white;margin-top:10px">You're now a Free Partner</p></div><div class="content"><p>Hello ${p.name || p.business_name || "there"}!</p><p>Your AEVOICE Free Partner account has been activated.</p><div class="highlight-box"><h3 style="margin-top:0">What You Get (FREE Forever):</h3><ul class="features"><li>Unlimited AI voice agents</li><li>Unlimited phone calls & conversations</li><li>Unlimited knowledge base storage</li><li>Full API access</li><li>Priority support</li></ul></div><h3>Next Steps:</h3><ol><li>Check your email for the platform invitation to set your password</li><li>Log in to your dashboard</li><li>Create your first AI agent or import data</li></ol><div style="text-align:center"><a href="${dashboardUrl}" class="button">Access Your Dashboard →</a></div><p style="color:#666;font-size:14px;margin-top:30px"><strong>Need Help?</strong> Reply to this email or reach out to <a href="mailto:partners@aevoice.ai">partners@aevoice.ai</a></p></div><div class="footer"><p>© AEVOICE ${new Date().getFullYear()}. All rights reserved.</p></div></body></html>`;

    try {
      await base44.integrations.Core.SendEmail({
        to: p.email,
        subject: "🎉 Welcome to AEVOICE Free Partner Program!",
        body: htmlBody,
        from_name: "AEVOICE Team",
      });
      console.log(`[inviteFP] welcome email sent`);
    } catch (emailErr) {
      console.warn(`[inviteFP] email warning: ${emailErr.message}`);
      // fallback SendGrid
      const sgKey = Deno.env.get("SENDGRID_API_KEY");
      if (sgKey) {
        try {
          await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: { "Authorization": `Bearer ${sgKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: p.email }], subject: "🎉 Welcome to AEVOICE Free Partner Program!" }],
              from: { email: "partners@aevoice.ai", name: "AEVOICE Team" },
              content: [{ type: "text/html", value: htmlBody }],
            }),
          });
        } catch (sg) { console.warn("[inviteFP] sendgrid fallback failed", sg.message); }
      }
    }

    return Response.json({
      success: true,
      invited: p.email,
      client_id: client.id,
      agent_id: agent.id,
      kb_id: kb.id,
      subscription_id: sub.id,
      wallet_id: wallet.id,
      message: "Free partner fully onboarded: client, agent, KB (standalone), subscription, wallet, invite, and email.",
    });
  } catch (error) {
    console.error("[inviteFP] error:", error);
    return Response.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
});