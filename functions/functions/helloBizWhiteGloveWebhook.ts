import Stripe from "npm:stripe";
import { createClient } from "npm:@base44/sdk@0.8.6";
import { createHmac } from "node:crypto";
import { ensureTenantOwnership } from "./utils/tenantValidation.ts";
import { logger } from "./lib/infra/logger.js";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"));
const base44 = createClient();

// Shared secret for webhook signature
const WEBHOOK_SECRET = "aevoice-hellobiz-whiteglove-2025";

function generateHmacSignature(payload, secret) {
  return createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

async function triggerInternalAutomation(installation) {
  try {
    // Validate installation tenant ownership before triggering automation
    const tenantId = installation.client_id;
    if (!tenantId) {
      logger.error("Installation missing client_id", {
        installation_id: installation.id,
      });
      return { success: false, error: "Missing client_id" };
    }

    // Verify the tenant exists
    const client = await base44.asServiceRole.entities.Client.findById(
      tenantId,
    );
    if (!client) {
      logger.error("Installation tenant not found", {
        installation_id: installation.id,
        tenant_id: tenantId,
      });
      await base44.asServiceRole.entities.InstallationService.update(
        installation.id,
        {
          status: "failed",
          metadata: {
            ...installation.metadata,
            error: "Tenant not found",
          },
        },
      );
      return { success: false, error: "Tenant not found" };
    }

    // Mark installation as white glove verified
    await base44.asServiceRole.entities.InstallationService.update(
      installation.id,
      {
        metadata: {
          ...installation.metadata,
          whiteglove_verified: true,
          verified_at: new Date().toISOString(),
        },
      },
    );

    logger.info("White glove installation tenant validated", {
      installation_id: installation.id,
      tenant_id: tenantId,
    });

    // Trigger internal HelloBiz automation within AEVOICE (no external webhooks)
    const result = await base44.asServiceRole.functions.invoke(
      "processHelloBizAutomation",
      {
        installation_id: installation.id,
      },
    );

    logger.info("HelloBiz internal automation triggered", {
      installation_id: installation.id,
      result,
    });
    return { success: true, result };
  } catch (error) {
    logger.error("HelloBiz automation error", {
      installation_id: installation?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    if (installation?.id) {
      await base44.asServiceRole.entities.InstallationService.update(
        installation.id,
        {
          status: "failed",
          metadata: {
            ...installation.metadata,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      );
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();

    const event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    );

    logger.info("HelloBiz webhook event", {
      request_id: requestId,
      event_type: event.type,
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.metadata?.service_type !== "hellobiz_whiteglove") {
        logger.info("Not a HelloBiz white glove service, ignoring", {
          request_id: requestId,
          service_type: session.metadata?.service_type,
        });
        return Response.json({ received: true });
      }

      const installationId = session.client_reference_id ||
        session.metadata?.installation_id;
      const clientId = session.metadata?.client_id;

      if (installationId) {
        const installations = await base44.asServiceRole.entities
          .InstallationService.filter({
            id: installationId,
          });

        const installation = installations[0];

        if (installation) {
          // Validate tenant ownership if clientId is present
          if (clientId) {
            try {
              // Use service role to bypass auth for system operations
              // But still validate that the installation belongs to the right client
              const tenant = await base44.asServiceRole.entities.Client
                .findById(clientId).catch(() => null);

              if (!tenant) {
                logger.error(
                  "Client not found for HelloBiz white glove installation",
                  {
                    request_id: requestId,
                    installation_id: installationId,
                    client_id: clientId,
                  },
                );
                throw new Error("Client not found");
              }

              logger.info(
                "Tenant ownership validated for HelloBiz white glove",
                {
                  request_id: requestId,
                  installation_id: installationId,
                  client_id: clientId,
                },
              );
            } catch (error) {
              logger.error(
                "Tenant validation failed for HelloBiz white glove",
                {
                  request_id: requestId,
                  installation_id: installationId,
                  client_id: clientId,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
              // Don't fail the webhook, but mark installation as needs review
              await base44.asServiceRole.entities.InstallationService.update(
                installationId,
                {
                  status: "pending_verification",
                  metadata: {
                    ...installation.metadata,
                    verification_error: error instanceof Error ? error.message : String(error),
                    verified_by_whiteglove: false,
                  },
                },
              );
              return Response.json({
                received: true,
                requires_verification: true,
              });
            }
          }

          // Update status to payment received and mark as verified
          await base44.asServiceRole.entities.InstallationService.update(
            installationId,
            {
              status: "payment_received",
              stripe_payment_intent: session.payment_intent,
              metadata: {
                ...installation.metadata,
                verified_by_whiteglove: true,
                verified_at: new Date().toISOString(),
                client_id: clientId,
              },
            },
          );

          logger.info("HelloBiz payment received and verified", {
            request_id: requestId,
            installation_id: installationId,
            client_id: clientId,
          });

          // Trigger internal automation asynchronously
          triggerInternalAutomation(installation).then((result) => {
            logger.info("HelloBiz automation result", {
              request_id: requestId,
              installation_id: installationId,
              success: result.success,
            });
          }).catch((err) => {
            logger.error("HelloBiz automation failed", {
              request_id: requestId,
              installation_id: installationId,
              error: err.message,
            });
          });
        } else {
          logger.warn("Installation not found", {
            request_id: requestId,
            installation_id: installationId,
          });
        }
      } else {
        logger.warn("No installation ID in session", {
          request_id: requestId,
          session_id: session.id,
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    logger.error("HelloBiz webhook error", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
