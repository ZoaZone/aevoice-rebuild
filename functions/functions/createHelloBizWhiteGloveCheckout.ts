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

    const formData = await req.json();

    // Create HelloBiz White Glove record
    const whiteGlove = await base44.asServiceRole.entities.InstallationService
      .create({
        user_id: user.id,
        customer_email: formData.email || user.email,
        business_name: formData.businessName,
        website: formData.website,
        phone: formData.phone,
        industry: formData.industry,
        // HelloBiz-specific fields from 7-step form
        business_description: formData.businessDescription,
        target_audience: formData.targetAudience,
        business_goals: formData.businessGoals,
        automation_needs: formData.automationNeeds,
        current_systems: formData.currentSystems,
        integration_preferences: formData.integrationPreferences,
        additional_notes: formData.additionalNotes,
        status: "pending_payment",
        flowsync_webhook_sent: false,
        metadata: {
          service_type: "hellobiz_whiteglove",
          package: "$100 HelloBiz White Glove",
          includes: [
            "Voice AI Agent",
            "FlowSync Automation Workflows",
            "HelloBiz Marketplace Integration",
            "CRM Integrations",
            "Extended Support",
          ],
        },
      });

    // Create Stripe checkout session for $100
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "HelloBiz White Glove Service - $100",
              description:
                "Complete AI voice agent + FlowSync automation + HelloBiz marketplace integration",
              images: [
                "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG",
              ],
            },
            unit_amount: 10000, // $100.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        req.headers.get("origin") || "https://aevoice.ai"
      }/InstallationService?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        req.headers.get("origin") || "https://aevoice.ai"
      }/HelloBizOnboarding?cancelled=true`,
      client_reference_id: whiteGlove.id,
      customer_email: formData.email || user.email,
      metadata: {
        service_type: "hellobiz_whiteglove",
        installation_id: whiteGlove.id,
        business_name: formData.businessName,
      },
    });

    // Update with payment intent
    await base44.asServiceRole.entities.InstallationService.update(
      whiteGlove.id,
      {
        stripe_payment_intent: session.id,
      },
    );

    return Response.json({
      checkout_url: session.url,
      installation_id: whiteGlove.id,
    });
  } catch (error) {
    console.error("Error creating HelloBiz checkout:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
