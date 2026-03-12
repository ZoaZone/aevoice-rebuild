import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import Stripe from "npm:stripe@17.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"), {
  apiVersion: "2024-12-18.acacia",
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan_id, plan_type, price, user_email, success_url, cancel_url } = await req.json();

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({
      email: user_email,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user_email,
        name: user.full_name,
        metadata: {
          base44_user_id: user.id,
          plan_type: "voice_chatbot",
        },
      });
    }

    // Create checkout session based on plan type
    let sessionParams = {
      customer: customer.id,
      success_url,
      cancel_url,
      metadata: {
        plan_id,
        plan_type,
        user_id: user.id,
        user_email: user_email,
      },
    };

    if (plan_type === "monthly") {
      // Monthly subscription
      sessionParams.mode = "subscription";
      sessionParams.line_items = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Voice Chatbot - Monthly",
            description: "Website voice chatbot with $0.12/min usage",
            images: [
              "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG",
            ],
          },
          recurring: {
            interval: "month",
          },
          unit_amount: price * 100,
        },
        quantity: 1,
      }];
    } else if (plan_type === "one_time") {
      // One-time payment
      sessionParams.mode = "payment";
      sessionParams.line_items = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Voice Chatbot - Lifetime Access",
            description: "One-time payment for lifetime chatbot access. Usage charged at $0.12/min",
            images: [
              "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG",
            ],
          },
          unit_amount: price * 100,
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error("Chatbot checkout error:", error);
    return Response.json({
      error: error instanceof Error
        ? error.message
        : String(error) || "Failed to create checkout session",
    }, { status: 500 });
  }
});
