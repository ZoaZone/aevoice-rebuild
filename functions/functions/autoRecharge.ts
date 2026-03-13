import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Auto-recharge request received", {
      request_id: requestId,
    });

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // Check if auto-recharge should trigger for a wallet
    async function checkAndTriggerRecharge({ walletId }) {
      // Get wallet
      const wallets = await base44.entities.Wallet.filter({ id: walletId });
      if (!wallets || wallets.length === 0) {
        throw new Error("Wallet not found");
      }
      const wallet = wallets[0];

      // Get auto-recharge settings
      const settings = await base44.entities.AutoRechargeSettings.filter({
        wallet_id: walletId,
      });
      if (!settings || settings.length === 0) {
        return {
          triggered: false,
          reason: "No auto-recharge settings configured",
        };
      }
      const rechargeSettings = settings[0];

      // Check if enabled
      if (!rechargeSettings.enabled) {
        return { triggered: false, reason: "Auto-recharge is disabled" };
      }

      // Check if balance is below threshold
      if (wallet.credits_balance >= rechargeSettings.threshold_credits) {
        return {
          triggered: false,
          reason: "Balance above threshold",
          currentBalance: wallet.credits_balance,
          threshold: rechargeSettings.threshold_credits,
        };
      }

      // Check monthly limit
      const now = new Date();
      const lastRecharge = rechargeSettings.last_recharge_date
        ? new Date(rechargeSettings.last_recharge_date)
        : null;

      // Reset monthly counter if new month
      let rechargesToday = rechargeSettings.recharges_this_month || 0;
      if (lastRecharge && lastRecharge.getMonth() !== now.getMonth()) {
        rechargesToday = 0;
      }

      if (rechargesToday >= rechargeSettings.max_recharges_per_month) {
        return {
          triggered: false,
          reason: "Monthly recharge limit reached",
          limit: rechargeSettings.max_recharges_per_month,
          used: rechargesToday,
        };
      }

      // Get payment method
      const paymentMethods = await base44.entities.PaymentMethod.filter({
        id: rechargeSettings.payment_method_id,
      });

      if (!paymentMethods || paymentMethods.length === 0) {
        // Try to find default payment method for the wallet owner
        const defaultMethods = await base44.entities.PaymentMethod.filter({
          owner_type: wallet.owner_type,
          owner_id: wallet.owner_id,
          is_default: true,
        });

        if (!defaultMethods || defaultMethods.length === 0) {
          return {
            triggered: false,
            reason: "No payment method available",
            action_required: "Add a payment method to enable auto-recharge",
          };
        }
      }

      // TRIGGER RECHARGE
      // In production: Call Stripe to charge the payment method
      // const stripe = require('stripe')(Deno.env.get('STRIPE_SECRET_KEY'));
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: rechargeSettings.recharge_amount * 100,
      //   currency: wallet.currency.toLowerCase(),
      //   payment_method: paymentMethod.stripe_payment_method_id,
      //   confirm: true,
      // });

      const rechargeAmount = rechargeSettings.recharge_amount;
      const newBalance = wallet.credits_balance + rechargeAmount;

      // Update wallet balance
      await base44.entities.Wallet.update(walletId, {
        credits_balance: newBalance,
        last_topped_up_at: now.toISOString(),
      });

      // Create transaction record
      await base44.entities.Transaction.create({
        wallet_id: walletId,
        type: "topup",
        amount: rechargeAmount,
        balance_after: newBalance,
        description: `Auto-recharge: Added $${rechargeAmount} credits`,
        reference_type: "stripe_payment",
        reference_id: "pi_auto_" + Date.now(), // In production: actual Stripe payment intent ID
      });

      // Update recharge settings
      await base44.entities.AutoRechargeSettings.update(rechargeSettings.id, {
        last_recharge_date: now.toISOString(),
        recharges_this_month: rechargesToday + 1,
      });

      // Send notification email if enabled
      if (
        rechargeSettings.notify_on_recharge && rechargeSettings.notify_email
      ) {
        await base44.integrations.Core.SendEmail({
          to: rechargeSettings.notify_email,
          subject: `Auto-Recharge: $${rechargeAmount} added to your account`,
          body: `
            <h2>Auto-Recharge Successful</h2>
            <p>Your account has been automatically recharged.</p>
            <ul>
              <li><strong>Amount Added:</strong> $${rechargeAmount}</li>
              <li><strong>Previous Balance:</strong> $${wallet.credits_balance}</li>
              <li><strong>New Balance:</strong> $${newBalance}</li>
              <li><strong>Recharges This Month:</strong> ${
            rechargesToday + 1
          } of ${rechargeSettings.max_recharges_per_month}</li>
            </ul>
            <p>You can manage your auto-recharge settings in the Billing section.</p>
          `,
        });
      }

      return {
        triggered: true,
        amount: rechargeAmount,
        previousBalance: wallet.credits_balance,
        newBalance: newBalance,
        rechargesThisMonth: rechargesToday + 1,
        maxRecharges: rechargeSettings.max_recharges_per_month,
      };
    }

    // Process all wallets that need recharging (called by scheduled job)
    async function processAllWallets() {
      // Get all auto-recharge settings that are enabled
      const allSettings = await base44.asServiceRole.entities
        .AutoRechargeSettings.filter({
          enabled: true,
        });

      const results = [];
      for (const settings of allSettings || []) {
        const result = await checkAndTriggerRecharge({
          walletId: settings.wallet_id,
        });
        results.push({
          walletId: settings.wallet_id,
          ...result,
        });
      }

      return {
        processed: results.length,
        triggered: results.filter((r) => r.triggered).length,
        results,
      };
    }

    // Setup auto-recharge for a wallet
    async function setupAutoRecharge({
      walletId,
      enabled,
      thresholdCredits,
      rechargeAmount,
      maxRechargesPerMonth,
      paymentMethodId,
      notifyEmail,
    }) {
      // Check if settings already exist
      const existing = await base44.entities.AutoRechargeSettings.filter({
        wallet_id: walletId,
      });

      const data = {
        wallet_id: walletId,
        enabled: enabled ?? true,
        threshold_credits: thresholdCredits ?? 50,
        recharge_amount: rechargeAmount ?? 100,
        max_recharges_per_month: maxRechargesPerMonth ?? 5,
        payment_method_id: paymentMethodId,
        notify_on_recharge: true,
        notify_email: notifyEmail,
        recharges_this_month: 0,
      };

      if (existing && existing.length > 0) {
        await base44.entities.AutoRechargeSettings.update(existing[0].id, data);
        return { updated: true, settings: { ...existing[0], ...data } };
      } else {
        const newSettings = await base44.entities.AutoRechargeSettings.create(
          data,
        );
        return { created: true, settings: newSettings };
      }
    }

    // Get auto-recharge status
    async function getRechargeStatus({ walletId }) {
      const wallets = await base44.entities.Wallet.filter({ id: walletId });
      const settings = await base44.entities.AutoRechargeSettings.filter({
        wallet_id: walletId,
      });

      const wallet = wallets?.[0];
      const rechargeSettings = settings?.[0];

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const isNearThreshold = rechargeSettings
        ? wallet.credits_balance <= rechargeSettings.threshold_credits * 1.5
        : false;

      return {
        wallet: {
          id: wallet.id,
          balance: wallet.credits_balance,
          currency: wallet.currency,
        },
        autoRecharge: rechargeSettings
          ? {
            enabled: rechargeSettings.enabled,
            threshold: rechargeSettings.threshold_credits,
            amount: rechargeSettings.recharge_amount,
            rechargesThisMonth: rechargeSettings.recharges_this_month,
            maxRecharges: rechargeSettings.max_recharges_per_month,
            lastRecharge: rechargeSettings.last_recharge_date,
            hasPaymentMethod: !!rechargeSettings.payment_method_id,
          }
          : null,
        warnings: {
          lowBalance: wallet.credits_balance < 50,
          nearThreshold: isNearThreshold,
          noAutoRecharge: !rechargeSettings?.enabled,
          noPaymentMethod: rechargeSettings &&
            !rechargeSettings.payment_method_id,
        },
      };
    }

    let result;
    switch (action) {
      case "checkAndTrigger":
        result = await checkAndTriggerRecharge(body);
        break;
      case "processAll":
        result = await processAllWallets();
        break;
      case "setup":
        result = await setupAutoRecharge(body);
        break;
      case "status":
        result = await getRechargeStatus(body);
        break;
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    logger.error("Auto-recharge failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
      action: body?.action,
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
