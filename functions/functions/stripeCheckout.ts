import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import Stripe from "npm:stripe@14.18.0";
import { logger } from "./lib/infra/logger.js";
import { maskEmail } from "./lib/security/piiMasking.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Stripe checkout request received", {
      request_id: requestId,
    });
    const stripeKey = Deno.env.get("STRIPE_API_KEY");
    if (!stripeKey) {
      return Response.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.error("Auth error:", authError);
      return Response.json({
        error: "Please log in to subscribe",
        needsLogin: true,
      }, { status: 401 });
    }

    if (!user) {
      return Response.json({
        error: "Please log in to subscribe",
        needsLogin: true,
      }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { action, priceId, successUrl, cancelUrl, customerId } = body;

    if (action === "createCheckout") {
      // SECURITY: Mask email to prevent PII exposure in Stripe logs
      console.log("[Stripe] Creating checkout", {
        request_id: requestId,
        price_id: priceId,
        user_email: maskEmail(user.email),
      });

      // Get or create Stripe customer
      let stripeCustomerId = customerId;

      if (!stripeCustomerId) {
        // Search for existing customer by email
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
          console.log("[Stripe] Found existing customer", {
            request_id: requestId,
            customer_id: stripeCustomerId,
          });
        } else {
          // Create new customer
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.full_name,
            metadata: {
              user_id: user.id,
              platform: "aevoice",
            },
          });
          stripeCustomerId = customer.id;
          console.log("[Stripe] Created new customer", {
            request_id: requestId,
            customer_id: stripeCustomerId,
          });
        }
      }

      // Determine mode based on price type
      const price = await stripe.prices.retrieve(priceId);
      const mode = price.recurring ? "subscription" : "payment";
      console.log("Price mode:", mode);

      // Use fixed URLs for the app
      const appUrl = "https://aevoice.app.base44.com";

      // Create checkout session with minimal config
      const sessionConfig = {
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: mode,
        success_url: `${appUrl}/Onboarding?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/Pricing?canceled=true`,
        allow_promotion_codes: true,
      };

      // Only add subscription_data for subscriptions
      if (mode === "subscription") {
        sessionConfig.subscription_data = {
          metadata: {
            user_id: user.id,
            user_email: user.email,
          },
        };
      }

      console.log(
        "Creating session with config:",
        JSON.stringify(sessionConfig),
      );
      const session = await stripe.checkout.sessions.create(sessionConfig);
      console.log("Session created:", session.id, "URL:", session.url);

      if (!session.url) {
        console.error(
          "No checkout URL returned from Stripe:",
          JSON.stringify(session),
        );
        return Response.json({ error: "Failed to create checkout URL" }, {
          status: 500,
        });
      }

      return Response.json({
        sessionId: session.id,
        url: session.url,
      });
    }

    if (action === "getProducts") {
      // Fetch all active products with prices
      const products = await stripe.products.list({ active: true, limit: 20 });
      const prices = await stripe.prices.list({ active: true, limit: 50 });

      const productsWithPrices = products.data.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        prices: prices.data.filter((p) => p.product === product.id).map(
          (p) => ({
            id: p.id,
            amount: p.unit_amount / 100,
            currency: p.currency,
            interval: p.recurring?.interval,
            type: p.recurring ? "recurring" : "one_time",
          }),
        ),
      }));

      return Response.json({ products: productsWithPrices });
    }

    if (action === "getSubscription") {
      // Get user's active subscriptions
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return Response.json({ subscription: null });
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return Response.json({ subscription: null });
      }

      const sub = subscriptions.data[0];
      return Response.json({
        subscription: {
          id: sub.id,
          status: sub.status,
          plan: sub.items.data[0]?.price?.id,
          current_period_end: new Date(sub.current_period_end * 1000)
            .toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        },
      });
    }

    if (action === "cancelSubscription") {
      const { subscriptionId } = body;

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      return Response.json({
        success: true,
        cancel_at: new Date(subscription.current_period_end * 1000)
          .toISOString(),
      });
    }

    if (action === "createPortalSession") {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return Response.json({ error: "No customer found" }, { status: 404 });
      }

      const portalOrigin = req.headers.get("origin") ||
        req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
        "https://aevoice.app.base44.com";
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: `${portalOrigin}/Billing`,
      });

      return Response.json({ url: portalSession.url });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Stripe checkout failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error) || "Internal server error",
    }, {
      status: 500,
    });
  }
});
