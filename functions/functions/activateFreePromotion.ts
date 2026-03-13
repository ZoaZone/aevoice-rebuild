import { createClient } from "npm:@base44/sdk@0.8.6";

const base44 = createClient();

Deno.serve(async (req) => {
  try {
    const { promotion_id, user_email } = await req.json();

    // Fetch promotion
    const promos = await base44.asServiceRole.entities.FreeUserPromotion.filter(
      {
        id: promotion_id,
      },
    );
    const promo = promos[0];

    if (!promo) {
      return Response.json({ error: "Promotion not found" }, { status: 404 });
    }

    if (promo.status === "active") {
      return Response.json({ error: "Promotion already activated" }, {
        status: 400,
      });
    }

    // Create client for user
    const client = await base44.asServiceRole.entities.Client.create({
      agency_id: "promotions",
      name: user_email.split("@")[0] + " (Promo)",
      slug: `promo-${Date.now()}`,
      industry: "other",
      contact_email: user_email,
      status: "active",
    });

    // Calculate expiration
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + promo.duration_days * 24 * 60 * 60 * 1000,
    );

    let agentId = null;
    let walletId = null;

    // Create based on promo type
    if (
      promo.promo_type === "free_agent" || promo.promo_type === "free_lifetime"
    ) {
      const agent = await base44.asServiceRole.entities.Agent.create({
        client_id: client.id,
        name: `${user_email.split("@")[0]} AI Assistant`,
        description: `Created via ${promo.promo_code} promotion`,
        agent_type: "general",
        system_prompt:
          "You are a helpful AI assistant. Respond professionally and assist with inquiries.",
        greeting_message: "Hello! How can I help you today?",
        voice_provider: "openai",
        voice_id: "nova",
        language: "en-US",
        status: "active",
      });
      agentId = agent.id;
    }

    if (promo.credits_amount > 0) {
      const wallet = await base44.asServiceRole.entities.Wallet.create({
        owner_type: "client",
        owner_id: client.id,
        credits_balance: promo.credits_amount,
        currency: "USD",
      });
      walletId = wallet.id;
    }

    // Update promotion
    await base44.asServiceRole.entities.FreeUserPromotion.update(promotion_id, {
      status: "active",
      activated_at: now.toISOString(),
      expires_at: promo.promo_type === "free_lifetime" ? null : expiresAt.toISOString(),
      created_client_id: client.id,
      created_agent_id: agentId,
    });

    // Send welcome email
    const promoTypeText: Record<string, string> = {
      free_trial: `${promo.credits_amount} free credits for ${promo.duration_days} days`,
      free_agent: `Free AI agent for ${promo.duration_days} days`,
      free_credits: `${promo.credits_amount} credits`,
      free_lifetime: "FREE Lifetime Access",
    };
    const selectedPromoText = promoTypeText[promo.promo_type] ||
      "Free promotion";

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user_email,
      subject: "🎉 Your AEVOICE Free Promotion is Activated!",
      body: `
Hi there,

Welcome to AEVOICE! Your promotion has been activated.

🎁 Promotion: ${promo.promo_code}
✨ Benefits: ${selectedPromoText}
${
        promo.promo_type !== "free_lifetime"
          ? `⏰ Expires: ${expiresAt.toLocaleDateString()}`
          : "⏰ Never expires - Lifetime access!"
      }

${agentId ? `🤖 Your AI Agent: Created and ready to use` : ""}
${promo.credits_amount > 0 ? `💳 Credits: ${promo.credits_amount} minutes available` : ""}

🚀 Get Started:
https://aevoice.ai/Dashboard

Questions? Reply to this email or contact care@aevoice.ai

Best regards,
AEVOICE Team
      `,
    });

    await base44.asServiceRole.entities.FreeUserPromotion.update(promotion_id, {
      welcome_email_sent: true,
    });

    return Response.json({
      success: true,
      client_id: client.id,
      agent_id: agentId,
      wallet_id: walletId,
      expires_at: promo.promo_type === "free_lifetime" ? null : expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error activating promotion:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
