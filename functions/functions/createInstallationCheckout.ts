import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      business_name,
      website,
      phone,
      industry,
      phone_provisioning_option,
      existing_phone_number,
      existing_twilio_account_sid,
      existing_twilio_auth_token,
      existing_twilio_webhook_url,
      phone_provider_preference,
      phone_number_country,
      phone_number_area_code,
      auto_purchase_consent,
    } = await req.json();

    // Create installation record
    const installation = await base44.entities.InstallationService.create({
      user_id: user.id,
      customer_email: user.email,
      business_name,
      website,
      phone,
      industry,
      phone_provisioning_option: phone_provisioning_option || "skip",
      existing_phone_number,
      existing_twilio_account_sid,
      existing_twilio_auth_token,
      existing_twilio_webhook_url,
      phone_provider_preference: phone_provider_preference || "twilio",
      phone_number_country: phone_number_country || "US",
      phone_number_area_code,
      auto_purchase_consent: auto_purchase_consent || false,
      status: "pending_payment",
      progress_updates: [],
    });

    // Create Stripe checkout session for $50 Installation Service
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "AEVOICE Installation Service",
              description:
                "Complete AI agent setup by FlowSync automation - includes website scraping, knowledge base creation, agent configuration, and widget deployment",
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
        req.headers.get("origin")
      }/InstallationService?success=true&installation_id=${installation.id}`,
      cancel_url: `${req.headers.get("origin")}/InstallationService?canceled=true`,
      customer_email: user.email,
      metadata: {
        installation_id: installation.id,
        user_id: user.id,
        type: "installation_service",
      },
    });

    return Response.json({
      checkout_url: session.url,
      installation_id: installation.id,
    });
  } catch (error) {
    console.error("Error creating installation checkout:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
