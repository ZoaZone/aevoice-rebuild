import Stripe from "npm:stripe";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create AEVOICE White Glove record
    const whiteGlove = await base44.asServiceRole.entities.InstallationService
      .create({
        user_id: user.id,
        customer_email: user.email,
        status: "pending_payment",
        flowsync_webhook_sent: false,
        metadata: {
          service_type: "aevoice_whiteglove",
          package: "$50 AEVOICE White Glove",
          includes: [
            "Automated AEVOICE account setup",
            "Voice assistant configuration",
            "Template installation",
            "Instant activation",
            "Email support included",
          ],
        },
      });

    // Create Stripe checkout session for $50
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "AEVOICE White Glove Service - $50",
              description: "Complete automated onboarding for your AI voice assistant",
              images: [
                "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG",
              ],
            },
            unit_amount: 5000, // $50.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        req.headers.get("origin") || "https://aevoice.ai"
      }/InstallationService?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin") || "https://aevoice.ai"}/Pricing?cancelled=true`,
      client_reference_id: whiteGlove.id,
      customer_email: user.email,
      metadata: {
        service_type: "aevoice_whiteglove",
        installation_id: whiteGlove.id,
        user_id: user.id,
      },
    });

    // Update with checkout session ID
    await base44.asServiceRole.entities.InstallationService.update(
      whiteGlove.id,
      {
        stripe_payment_intent: session.id, // Store session ID for webhook correlation
      },
    );

    return Response.json({
      checkout_url: session.url,
      installation_id: whiteGlove.id,
    });
  } catch (error) {
    console.error("Error creating AEVOICE checkout:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
