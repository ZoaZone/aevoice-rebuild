import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import Stripe from "npm:stripe@17.5.0";
import { logger } from "./lib/infra/logger.js";
import {
  computeAffiliateCommission,
  computeAgencyCommission,
  estimateCosts,
} from "./commissionService.ts";

/**
 * stripeConnect.ts
 *
 * Manages Stripe Connect accounts and implements dynamic real-time revenue splitting.
 *
 * REAL-TIME SPLITTING APPROACH:
 * - At payment/subscription creation time, we estimate costs (LLM + operational)
 * - Calculate commission using commissionService
 * - Set application_fee_amount = platformFeeCents (gross - commission)
 * - Set transfer_data.destination = connected account ID
 * - Commission goes to connected account, platform fee stays with platform
 *
 * IMPORTANT NOTES:
 * - Cost estimates are conservative and will be reconciled with actual usage later
 * - Subscription splitting uses application_fee_percent (can't dynamically adjust per cycle)
 * - For precise reconciliation, use invoice.finalized webhook (future enhancement)
 * - Commission events are created by commissionWorker for audit trail
 *
 * @module stripeConnect
 */

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"), {
  apiVersion: "2024-12-18.acacia",
});

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Stripe Connect request received", {
      request_id: requestId,
    });
    // Initialize Base44 client
    const base44 = createClientFromRequest(req);

    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, email, business_name, account_id } = body;

    switch (action) {
      case "create_account": {
        // Create Stripe Connect account
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: email,
          business_type: "company",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            name: business_name,
          },
        });

        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `https://aevoice.base44.app/agency-portal`,
          return_url: `https://aevoice.base44.app/agency-portal?stripe_connected=true`,
          type: "account_onboarding",
        });

        // Store account ID in agency settings
        const agencies = await base44.entities.Agency.filter({
          primary_email: email,
        });
        if (agencies.length > 0) {
          await base44.entities.Agency.update(agencies[0].id, {
            settings: {
              ...agencies[0].settings,
              stripe_account_id: account.id,
            },
          });
        }

        return Response.json({
          success: true,
          account_id: account.id,
          account_link: accountLink.url,
        });
      }

      case "create_split_payment": {
        // Create payment with dynamic commission-based split
        const {
          amount,
          client_id,
          stripe_account_id,
          customer_email,
          plan_type = "default",
          referral_code,
        } = body;

        // Resolve owner (agency or affiliate)
        let ownerType = null;
        let ownerId = null;
        let connectedAccountId = stripe_account_id;

        if (stripe_account_id) {
          // Look up agency by stripe_account_id
          // NOTE: Using JSONB path operations. Consider adding dedicated indexed column
          // or GIN index on settings for better performance at scale.
          const agencyResult = await base44.asServiceRole.db.query(
            `SELECT id FROM agencies WHERE settings->>'stripe_account_id' = $1`,
            [stripe_account_id],
          );

          if (agencyResult.rows.length > 0) {
            ownerType = "agency";
            ownerId = agencyResult.rows[0].id;
          }
        } else if (referral_code) {
          // Look up affiliate by referral_code
          const affiliateResult = await base44.asServiceRole.db.query(
            `SELECT id, settings FROM affiliates WHERE referral_code = $1`,
            [referral_code],
          );

          if (affiliateResult.rows.length > 0) {
            ownerType = "affiliate";
            ownerId = affiliateResult.rows[0].id;
            connectedAccountId = affiliateResult.rows[0].settings
              ?.stripe_account_id;
          }
        }

        if (!connectedAccountId) {
          return Response.json(
            { error: "No Stripe Connect account found" },
            { status: 400 },
          );
        }

        // Estimate costs and calculate commission
        const grossAmountUsd = amount / 100;
        const { llmCostUsd, otherCostsUsd } = estimateCosts(
          plan_type,
          grossAmountUsd,
        );

        let commissionData;

        if (ownerType === "agency" && ownerId) {
          const agencyResult = await base44.asServiceRole.db.query(
            `SELECT tier, byollm_enabled, co_brand_opt_in FROM agencies WHERE id = $1`,
            [ownerId],
          );

          const agency = agencyResult.rows[0] || {};

          commissionData = computeAgencyCommission({
            grossAmountUsd,
            llmCostUsd,
            otherCostsUsd,
            tier: agency.tier || "starter",
            byollmApplied: agency.byollm_enabled || false,
            coBrandOptIn: agency.co_brand_opt_in || false,
          });
        } else if (ownerType === "affiliate" && ownerId) {
          const affiliateResult = await base44.asServiceRole.db.query(
            `SELECT tier, commission_rate FROM affiliates WHERE id = $1`,
            [ownerId],
          );

          const affiliate = affiliateResult.rows[0] || {};

          commissionData = computeAffiliateCommission({
            grossAmountUsd,
            llmCostUsd,
            otherCostsUsd,
            tier: affiliate.tier || "bronze",
            customRate: affiliate.commission_rate,
          });
        } else {
          // Fallback to default 85/15 split
          const platformFee = Math.round(amount * 0.15);

          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            application_fee_amount: platformFee,
            transfer_data: {
              destination: connectedAccountId,
            },
            receipt_email: customer_email,
            metadata: {
              client_id: client_id,
              agency_share: (amount - platformFee).toString(),
              platform_fee: platformFee.toString(),
            },
          });

          return Response.json({
            success: true,
            payment_intent: paymentIntent.id,
            client_secret: paymentIntent.client_secret,
          });
        }

        // Calculate amounts in cents
        const commissionAmountCents = Math.round(
          commissionData.commissionAmountUsd * 100,
        );
        const platformFeeCents = amount - commissionAmountCents;

        // Create payment intent with calculated split
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          application_fee_amount: platformFeeCents,
          transfer_data: {
            destination: connectedAccountId,
          },
          receipt_email: customer_email,
          metadata: {
            client_id: client_id,
            owner_type: ownerType,
            owner_id: ownerId,
            plan_type: plan_type,
            commission_amount_usd: commissionData.commissionAmountUsd
              .toString(),
            commission_rate: commissionData.commissionRate.toString(),
            platform_fee: platformFeeCents.toString(),
          },
        });

        logger.info("Split payment created with dynamic commission", {
          request_id: requestId,
          payment_intent: paymentIntent.id,
          owner_type: ownerType,
          owner_id: ownerId,
          gross_amount_usd: grossAmountUsd,
          commission_amount_usd: commissionData.commissionAmountUsd,
          platform_fee_cents: platformFeeCents,
        });

        return Response.json({
          success: true,
          payment_intent: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          commission_amount_usd: commissionData.commissionAmountUsd,
        });
      }

      case "create_split_subscription": {
        /**
         * IMPORTANT: Subscription splitting uses application_fee_percent which cannot
         * be dynamically adjusted per billing cycle. We use an estimated percentage here.
         * For precise reconciliation, implement invoice.finalized webhook handling.
         */
        const {
          price_id,
          customer_email,
          stripe_account_id,
          client_id,
          plan_type = "default",
          referral_code,
        } = body;

        // Resolve owner (agency or affiliate)
        let ownerType = null;
        let ownerId = null;
        let connectedAccountId = stripe_account_id;

        if (stripe_account_id) {
          const agencyResult = await base44.asServiceRole.db.query(
            `SELECT id FROM agencies WHERE settings->>'stripe_account_id' = $1`,
            [stripe_account_id],
          );

          if (agencyResult.rows.length > 0) {
            ownerType = "agency";
            ownerId = agencyResult.rows[0].id;
          }
        } else if (referral_code) {
          const affiliateResult = await base44.asServiceRole.db.query(
            `SELECT id, settings FROM affiliates WHERE referral_code = $1`,
            [referral_code],
          );

          if (affiliateResult.rows.length > 0) {
            ownerType = "affiliate";
            ownerId = affiliateResult.rows[0].id;
            connectedAccountId = affiliateResult.rows[0].settings
              ?.stripe_account_id;
          }
        }

        if (!connectedAccountId) {
          return Response.json(
            { error: "No Stripe Connect account found" },
            { status: 400 },
          );
        }

        // Get price details
        const price = await stripe.prices.retrieve(price_id);
        const amount = price.unit_amount;
        const grossAmountUsd = amount / 100;

        // Estimate commission percentage
        const { llmCostUsd, otherCostsUsd } = estimateCosts(
          plan_type,
          grossAmountUsd,
        );

        let commissionData;

        if (ownerType === "agency" && ownerId) {
          const agencyResult = await base44.asServiceRole.db.query(
            `SELECT tier, byollm_enabled FROM agencies WHERE id = $1`,
            [ownerId],
          );

          const agency = agencyResult.rows[0] || {};

          commissionData = computeAgencyCommission({
            grossAmountUsd,
            llmCostUsd,
            otherCostsUsd,
            tier: agency.tier || "starter",
            byollmApplied: agency.byollm_enabled || false,
          });
        } else if (ownerType === "affiliate" && ownerId) {
          const affiliateResult = await base44.asServiceRole.db.query(
            `SELECT tier, commission_rate FROM affiliates WHERE id = $1`,
            [ownerId],
          );

          const affiliate = affiliateResult.rows[0] || {};

          commissionData = computeAffiliateCommission({
            grossAmountUsd,
            llmCostUsd,
            otherCostsUsd,
            tier: affiliate.tier || "bronze",
            customRate: affiliate.commission_rate,
          });
        } else {
          // Fallback to 15% platform fee
          commissionData = {
            commissionRate: 85,
            commissionAmountUsd: grossAmountUsd * 0.85,
          };
        }

        // Calculate platform fee percentage (Stripe requires percentage for subscriptions)
        const platformFeePercent = 100 - commissionData.commissionRate;

        // Create or retrieve customer
        let customer;
        const existingCustomers = await stripe.customers.list({
          email: customer_email,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: customer_email,
            metadata: { client_id },
          });
        }

        // Create subscription with calculated fee percentage
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price_id }],
          application_fee_percent: platformFeePercent,
          transfer_data: {
            destination: connectedAccountId,
          },
          metadata: {
            client_id: client_id,
            owner_type: ownerType,
            owner_id: ownerId,
            plan_type: plan_type,
            platform_fee_percent: platformFeePercent.toString(),
            commission_rate: commissionData.commissionRate.toString(),
          },
        });

        logger.info("Split subscription created with dynamic commission", {
          request_id: requestId,
          subscription_id: subscription.id,
          owner_type: ownerType,
          owner_id: ownerId,
          platform_fee_percent: platformFeePercent,
          commission_rate: commissionData.commissionRate,
        });

        return Response.json({
          success: true,
          subscription_id: subscription.id,
          customer_id: customer.id,
          platform_fee_percent: platformFeePercent,
          note:
            "Subscription uses estimated fee percentage. Reconcile with actual usage via invoice.finalized webhook.",
        });
      }

      case "get_account_status": {
        const account = await stripe.accounts.retrieve(account_id);

        return Response.json({
          success: true,
          account: {
            id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
          },
        });
      }

      case "create_checkout_with_split": {
        // Create Stripe Checkout with dynamic revenue split
        const {
          price_id,
          success_url,
          cancel_url,
          customer_email,
          stripe_account_id,
          client_id,
          plan_type = "default",
          referral_code,
        } = body;

        // Resolve owner (agency or affiliate)
        let ownerType = null;
        let ownerId = null;
        let connectedAccountId = stripe_account_id;

        if (stripe_account_id) {
          const agencyResult = await base44.asServiceRole.db.query(
            `SELECT id FROM agencies WHERE settings->>'stripe_account_id' = $1`,
            [stripe_account_id],
          );

          if (agencyResult.rows.length > 0) {
            ownerType = "agency";
            ownerId = agencyResult.rows[0].id;
          }
        } else if (referral_code) {
          const affiliateResult = await base44.asServiceRole.db.query(
            `SELECT id, settings FROM affiliates WHERE referral_code = $1`,
            [referral_code],
          );

          if (affiliateResult.rows.length > 0) {
            ownerType = "affiliate";
            ownerId = affiliateResult.rows[0].id;
            connectedAccountId = affiliateResult.rows[0].settings
              ?.stripe_account_id;
          }
        }

        if (!connectedAccountId) {
          return Response.json(
            { error: "No Stripe Connect account found" },
            { status: 400 },
          );
        }

        // Get price and estimate commission
        const price = await stripe.prices.retrieve(price_id);
        const amount = price.unit_amount;
        const grossAmountUsd = amount / 100;
        const { llmCostUsd, otherCostsUsd } = estimateCosts(
          plan_type,
          grossAmountUsd,
        );

        let commissionData;

        if (ownerType === "agency" && ownerId) {
          const agencyResult = await base44.asServiceRole.db.query(
            `SELECT tier, byollm_enabled FROM agencies WHERE id = $1`,
            [ownerId],
          );

          const agency = agencyResult.rows[0] || {};

          commissionData = computeAgencyCommission({
            grossAmountUsd,
            llmCostUsd,
            otherCostsUsd,
            tier: agency.tier || "starter",
            byollmApplied: agency.byollm_enabled || false,
          });
        } else if (ownerType === "affiliate" && ownerId) {
          const affiliateResult = await base44.asServiceRole.db.query(
            `SELECT tier, commission_rate FROM affiliates WHERE id = $1`,
            [ownerId],
          );

          const affiliate = affiliateResult.rows[0] || {};

          commissionData = computeAffiliateCommission({
            grossAmountUsd,
            llmCostUsd,
            otherCostsUsd,
            tier: affiliate.tier || "bronze",
            customRate: affiliate.commission_rate,
          });
        } else {
          commissionData = {
            commissionRate: 85,
          };
        }

        const platformFeePercent = 100 - commissionData.commissionRate;

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: price_id, quantity: 1 }],
          success_url: success_url,
          cancel_url: cancel_url,
          customer_email: customer_email,
          subscription_data: {
            application_fee_percent: platformFeePercent,
            transfer_data: {
              destination: connectedAccountId,
            },
            metadata: {
              client_id: client_id,
              owner_type: ownerType,
              owner_id: ownerId,
              plan_type: plan_type,
            },
          },
          metadata: {
            client_id: client_id,
            owner_type: ownerType,
            owner_id: ownerId,
            platform_fee_percent: platformFeePercent.toString(),
            plan_type: plan_type,
          },
        });

        return Response.json({
          success: true,
          checkout_url: session.url,
          session_id: session.id,
        });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Stripe Connect failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
      details: error.raw?.message || error.type,
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      details: error.raw?.message || error.type,
    }, { status: 500 });
  }
});
