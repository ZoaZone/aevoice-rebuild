import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@base44/sdk@0.8.6";
import { createHmac } from "node:crypto";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"));
const base44 = createClient();

// Automation is now triggered from PostPaymentOnboarding page after user completes form
// async function triggerInternalAutomation(installation) {
//   try {
//     const result = await base44.asServiceRole.functions.invoke('processInstallationAutomation', {
//       installation_id: installation.id
//     });
//     console.log('Internal automation triggered:', result);
//     return { success: true, result };
//   } catch (error) {
//     console.error('Internal automation error:', error);
//     await base44.asServiceRole.entities.InstallationService.update(installation.id, {
//       status: 'failed'
//     });
//     return { success: false, error: error instanceof Error ? error.message : String(error) };
//   }
// }

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Webhook signature verification failed" }, {
      status: 400,
    });
  }

  // Handle payment success for installation service
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.metadata?.type === "installation_service") {
      const installationId = session.metadata.installation_id;

      try {
        // Update installation status
        await base44.asServiceRole.entities.InstallationService.update(
          installationId,
          {
            status: "payment_received",
            stripe_payment_intent: session.payment_intent,
          },
        );

        console.log(
          `Payment received for installation ${installationId}. User will be redirected to PostPaymentOnboarding.`,
        );

        // Automation will be triggered from PostPaymentOnboarding page after user completes the form
      } catch (error) {
        console.error("Error processing installation payment:", error);
      }
    }
  }

  return Response.json({ received: true });
});
