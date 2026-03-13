import Stripe from "npm:stripe";
import { createClient } from "npm:@base44/sdk@0.8.6";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"));
const base44 = createClient();

async function triggerInternalAutomation(installation) {
  try {
    // Trigger AEVOICE white glove automation (12-step standard installation process)
    const result = await base44.asServiceRole.functions.invoke(
      "processInstallationAutomation",
      {
        installation_id: installation.id,
      },
    );

    console.log("AEVOICE internal automation triggered:", result);
    return { success: true, result };
  } catch (error) {
    console.error("AEVOICE automation error:", error);
    await base44.asServiceRole.entities.InstallationService.update(
      installation.id,
      {
        status: "failed",
      },
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

Deno.serve(async (req) => {
  try {
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();

    const event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    );

    console.log("AEVOICE webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.metadata?.service_type !== "aevoice_whiteglove") {
        console.log("Not an AEVOICE white glove service, ignoring");
        return Response.json({ received: true });
      }

      const installationId = session.client_reference_id ||
        session.metadata?.installation_id;

      if (installationId) {
        const installations = await base44.asServiceRole.entities
          .InstallationService.filter({
            id: installationId,
          });

        const installation = installations[0];

        if (installation) {
          // Update status to payment received
          await base44.asServiceRole.entities.InstallationService.update(
            installationId,
            {
              status: "payment_received",
              stripe_payment_intent: session.payment_intent,
            },
          );

          console.log(
            `✅ AEVOICE payment received for installation ${installationId}`,
          );

          // Trigger internal automation asynchronously
          triggerInternalAutomation(installation).then((result) => {
            console.log("AEVOICE automation result:", result);
          }).catch((err) => {
            console.error("AEVOICE automation failed:", err);
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("AEVOICE webhook error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
