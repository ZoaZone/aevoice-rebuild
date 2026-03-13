import { createClient } from "npm:@base44/sdk@0.8.6";

const base44 = createClient();

function generatePromoCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AEVO-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const {
      emails,
      promo_type,
      duration_days,
      credits_amount,
      campaign_name,
      auto_activate,
    } = await req.json();

    if (!emails || emails.length === 0) {
      return Response.json({ error: "No emails provided" }, { status: 400 });
    }

    const createdPromos = [];

    for (const email of emails) {
      const promoCode = generatePromoCode();

      const promo = await base44.asServiceRole.entities.FreeUserPromotion
        .create({
          user_email: email.trim(),
          promo_code: promoCode,
          promo_type: promo_type || "free_trial",
          duration_days: duration_days || 30,
          credits_amount: credits_amount || 5,
          status: "pending",
          campaign_name: campaign_name || "Bulk Campaign",
          welcome_email_sent: false,
          reminder_sent: false,
        });

      // Auto-activate if requested
      if (auto_activate) {
        await base44.asServiceRole.functions.invoke("activateFreePromotion", {
          promotion_id: promo.id,
          user_email: email.trim(),
        });
      } else {
        // Send invitation email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email.trim(),
          subject: "🎁 You've Been Invited to Try AEVOICE FREE!",
          body: `
Hi,

You've received a special invitation to try AEVOICE - AI Voice Assistants for your business.

🎟️ Your Promo Code: ${promoCode}
🎁 Benefits: ${credits_amount} free credits for ${duration_days} days

To activate:
1. Visit: https://aevoice.ai
2. Sign up with this email: ${email}
3. Your promotion will be automatically applied

Questions? Contact care@aevoice.ai

Best regards,
AEVOICE Team
          `,
        });
      }

      createdPromos.push({
        email: email.trim(),
        promo_code: promoCode,
        id: promo.id,
      });
    }

    return Response.json({
      success: true,
      count: createdPromos.length,
      promotions: createdPromos,
    });
  } catch (error) {
    console.error("Error creating bulk promotions:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
