import { createClient } from "npm:@base44/sdk@0.8.6";
import { createHmac } from "node:crypto";

const base44 = createClient();
const FLOWSYNC_SECRET = "aevoice_flowsync_shared_secret_2025";

function verifyHmacSignature(payload, signature, timestamp) {
  const hmac = createHmac("sha256", FLOWSYNC_SECRET);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest("hex");

  if (signature !== expectedSignature) {
    return false;
  }

  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();
  const timeDiff = Math.abs(now - requestTime);

  if (timeDiff > 5 * 60 * 1000) {
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const installationId = pathParts[pathParts.indexOf("installation") + 1];

    if (!installationId) {
      return Response.json({ error: "Installation ID required" }, {
        status: 400,
      });
    }

    const body = await req.json();
    const signature = req.headers.get("X-FlowSync-Signature");
    const timestamp = req.headers.get("X-FlowSync-Timestamp");

    if (!verifyHmacSignature(body, signature, timestamp)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const {
      agent_id,
      agent_data,
      knowledge_base_id,
      widget_code,
      test_results,
    } = body;

    // Fetch installation
    const installations = await base44.asServiceRole.entities
      .InstallationService.filter({ id: installationId });
    const installation = installations[0];

    if (!installation) {
      return Response.json({ error: "Installation not found" }, {
        status: 404,
      });
    }

    // Update installation with completed agent data
    await base44.asServiceRole.entities.InstallationService.update(
      installationId,
      {
        status: "completed",
        completed_agent_id: agent_id,
        completed_agent_data: agent_data,
        widget_code,
        completion_date: new Date().toISOString(),
      },
    );

    // Send notification email to customer
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: installation.customer_email,
        subject: "✅ Your AEVOICE AI Agent is Ready!",
        body: `
Hi ${installation.business_name},

Great news! Your AI voice agent has been successfully set up by our FlowSync automation.

🤖 Agent Details:
- Agent ID: ${agent_id}
- Knowledge Base: Trained on your website content
- Status: Active and ready to handle calls

📊 What's Next:
1. Connect a phone number to your agent
2. Embed the widget on your website
3. Start receiving AI-powered calls 24/7

🔗 Access Your Dashboard:
https://aevoice.ai/Dashboard

Questions? Reply to this email or contact care@aevoice.ai

Best regards,
AEVOICE Team
        `,
      });
    } catch (emailError) {
      console.error("Error sending completion email:", emailError);
    }

    return Response.json({
      success: true,
      message: "Agent delivery received and installation completed",
    });
  } catch (error) {
    console.error("Error receiving installation agent:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
