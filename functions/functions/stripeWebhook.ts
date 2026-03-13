import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import Stripe from "npm:stripe@14.18.0";
import { logger } from "./lib/infra/logger.js";

// TYPE SAFETY FIX (Phase 2A #1-3): Import Stripe webhook event types
import type {
  StripeCheckoutSession,
  StripeProduct,
  StripeSubscription,
  StripeWebhookEvent,
} from "./lib/types/index.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // TYPE SAFETY FIX #1: Type event as StripeWebhookEvent
    let event: StripeWebhookEvent;
    try {
      // Cast to StripeWebhookEvent after construction
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      ) as unknown as StripeWebhookEvent;
      logger.info("Webhook signature verified", {
        request_id: requestId,
        event_type: event.type,
      });
    } catch (err) {
      logger.error("Webhook signature verification failed", {
        request_id: requestId,
        error: err.message,
        has_signature: !!signature,
      });
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { type, data } = event;

    switch (type) {
      case "checkout.session.completed": {
        // TYPE SAFETY FIX #2: Type session as StripeCheckoutSession
        const session = data.object as StripeCheckoutSession;
        const userEmail = session.metadata?.user_email ||
          session.customer_email;
        const userId = session.metadata?.user_id;

        if (session.mode === "subscription") {
          // TYPE SAFETY FIX #3: Type subscription explicitly
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          ) as unknown as StripeSubscription;
          const priceId = subscription.items.data[0]?.price?.id;
          const product = await stripe.products.retrieve(
            subscription.items.data[0]?.price?.product as string,
          ) as unknown as StripeProduct;

          // Determine plan type and credits from price ID
          // AEVA Plans:
          // - Aeva Mini: price_1SYvuWLh1QiuPaDbfpWQmbOO ($100/mo, 300 credits)
          // - Aeva Micro: price_1SYw1uLh1QiuPaDb51go7mCS ($35/mo, pay-as-you-go)
          // - Aeva Medium: price_1SYw9DLh1QiuPaDbBT0WebLM ($250/mo, 1666 credits)
          // - Aeva Mega: price_1SYwSuLh1QiuPaDbzolpuQAb ($1000/mo, 7000 credits)
          // - Aeva Recording Add-on: price_1SYwBsLh1QiuPaDbItHACps6 ($25/mo)
          let planType = "aeva-micro";
          let creditsToAdd = 0;

          if (priceId === "price_1SYvuWLh1QiuPaDbfpWQmbOO") {
            planType = "aeva-mini";
            creditsToAdd = 300;
          } else if (priceId === "price_1SYw1uLh1QiuPaDb51go7mCS") {
            planType = "aeva-micro";
            creditsToAdd = 0; // Pay as you go
          } else if (priceId === "price_1SYw9DLh1QiuPaDbBT0WebLM") {
            planType = "aeva-medium";
            creditsToAdd = 1666;
          } else if (priceId === "price_1SYwSuLh1QiuPaDbzolpuQAb") {
            planType = "aeva-mega";
            creditsToAdd = 7000;
          }

          // Find or create client
          const clients = await base44.asServiceRole.entities.Client.filter({
            contact_email: userEmail,
          });
          let client = clients?.[0];

          if (client) {
            // Update existing subscription
            const existingSubs = await base44.asServiceRole.entities
              .Subscription.filter({ client_id: client.id });
            if (existingSubs?.[0]) {
              await base44.asServiceRole.entities.Subscription.update(
                existingSubs[0].id,
                {
                  status: "active",
                  stripe_subscription_id: session.subscription,
                  plan_type: planType,
                  current_period_start: new Date(
                    subscription.current_period_start * 1000,
                  ).toISOString(),
                  current_period_end: new Date(
                    subscription.current_period_end * 1000,
                  ).toISOString(),
                },
              );
            } else {
              await base44.asServiceRole.entities.Subscription.create({
                client_id: client.id,
                stripe_subscription_id: session.subscription,
                plan_type: planType,
                status: "active",
                billing_cycle: subscription.items.data[0]?.price?.recurring?.interval ||
                  "monthly",
                current_period_start: new Date(
                  subscription.current_period_start * 1000,
                ).toISOString(),
                current_period_end: new Date(
                  subscription.current_period_end * 1000,
                ).toISOString(),
              });
            }

            // Allocate credits via credit distribution system
            if (creditsToAdd > 0) {
              await base44.asServiceRole.functions.invoke(
                "creditDistribution",
                {
                  action: "allocateCredits",
                  clientId: client.id,
                  planType: planType,
                  credits: creditsToAdd,
                },
              );

              // Record transaction
              const wallets = await base44.asServiceRole.entities.Wallet.filter(
                { owner_id: client.id },
              );
              if (wallets?.[0]) {
                await base44.asServiceRole.entities.Transaction.create({
                  wallet_id: wallets[0].id,
                  type: "subscription",
                  amount: creditsToAdd,
                  description: `${product.name} subscription - ${creditsToAdd} credits allocated`,
                  stripe_payment_id: session.payment_intent,
                });
              }
            }

            // Update client status
            await base44.asServiceRole.entities.Client.update(client.id, {
              status: "active",
            });
          }

          // Send confirmation email
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: userEmail,
            subject: "✅ Subscription Activated - Welcome to AEVOICE!",
            body: `
              <h2>Your subscription is now active!</h2>
              <p><strong>Plan:</strong> ${product.name}</p>
              <p><strong>Credits Added:</strong> ${creditsToAdd} minutes</p>
              <p><strong>Next billing date:</strong> ${
              new Date(subscription.current_period_end * 1000)
                .toLocaleDateString()
            }</p>
              <p>Login to your dashboard to start setting up your AI voice agent.</p>
              <p><a href="${
              req.headers.get("origin")
            }/Dashboard" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard →</a></p>
            `,
            from_name: "AEVOICE",
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = data.object;
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id,
        });

        if (subs?.[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000)
              .toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = data.object;
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id,
        });

        if (subs?.[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: "canceled",
          });

          // Update client status
          if (subs[0].client_id) {
            await base44.asServiceRole.entities.Client.update(
              subs[0].client_id,
              {
                status: "churned",
              },
            );
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = data.object;

        if (
          invoice.subscription &&
          invoice.billing_reason === "subscription_cycle"
        ) {
          // Recurring payment - add credits
          const subs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: invoice.subscription,
          });

          if (subs?.[0] && subs[0].client_id) {
            const wallets = await base44.asServiceRole.entities.Wallet.filter({
              owner_id: subs[0].client_id,
            });

            if (wallets?.[0]) {
              // Determine credits based on amount (AEVA Plans)
              let creditsToAdd = Math.round(invoice.amount_paid / 100); // $1 = 1 credit base
              if (invoice.amount_paid >= 10000) creditsToAdd = 300; // Aeva Mini ($100)
              if (invoice.amount_paid >= 25000) creditsToAdd = 1666; // Aeva Medium ($250)
              if (invoice.amount_paid >= 100000) creditsToAdd = 7000; // Aeva Mega ($1000)

              await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
                credits_balance: (wallets[0].credits_balance || 0) +
                  creditsToAdd,
                last_topped_up_at: new Date().toISOString(),
              });

              await base44.asServiceRole.entities.Transaction.create({
                wallet_id: wallets[0].id,
                type: "subscription",
                amount: creditsToAdd,
                description: `Monthly renewal - ${creditsToAdd} credits added`,
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = data.object;

        // Send payment failed notification
        if (invoice.customer_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: invoice.customer_email,
            subject: "⚠️ Payment Failed - Action Required",
            body: `
              <h2>Your payment could not be processed</h2>
              <p>We were unable to charge your payment method for your AEVOICE subscription.</p>
              <p><strong>Amount:</strong> $${(invoice.amount_due / 100).toFixed(2)}</p>
              <p>Please update your payment method to avoid service interruption.</p>
              <p><a href="${
              req.headers.get("origin")
            }/Billing" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method →</a></p>
            `,
            from_name: "AEVOICE",
          });
        }
        break;
      }
    }

    // Forward relevant events to commissionWorker asynchronously
    // This creates audit trail records for commission tracking
    if (
      ["checkout.session.completed", "invoice.payment_succeeded"].includes(type)
    ) {
      try {
        // Extract owner information from event metadata
        const ownerType = event.data.object?.metadata?.owner_type;
        const ownerId = event.data.object?.metadata?.owner_id;
        const grossAmount = event.data.object?.amount_total ||
          event.data.object?.amount_paid;

        if (ownerType && ownerId && grossAmount) {
          // Get base URL from environment or request origin
          const baseUrl = Deno.env.get("BASE_URL") ||
            req.headers.get("origin") || "https://aevoice.base44.app";

          // Asynchronously invoke commissionWorker
          fetch(`${baseUrl}/functions/commissionWorker`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": req.headers.get("Authorization") || "",
            },
            body: JSON.stringify({
              event_type: type,
              source: "stripe",
              source_id: event.data.object?.id,
              owner_type: ownerType,
              owner_id: ownerId,
              gross_amount_usd: grossAmount / 100, // Convert cents to dollars
              plan_type: event.data.object?.metadata?.plan_type || "default",
              metadata: event.data.object?.metadata || {},
            }),
          }).catch((error) => {
            // Don't fail webhook if commission worker fails
            logger.warn("Commission worker invocation failed", {
              request_id: requestId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
      } catch (error) {
        // Don't fail webhook if commission tracking fails
        logger.warn("Failed to forward event to commission worker", {
          request_id: requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
      event_type: event?.type || "unknown",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
