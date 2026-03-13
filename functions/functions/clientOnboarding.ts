import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Client onboarding request started", { request_id: requestId });

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // Generate a secure temporary password
    function generateTempPassword() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
      let password: string | null = null;
      for (let i = 0; i < 12; i++) {
        const base = password ?? "";
        password = base + chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password ?? "";
    }

    // Generate unique onboarding token
    function generateOnboardingToken() {
      return "onb_" + Date.now().toString(36) +
        Math.random().toString(36).substr(2, 9);
    }

    // Send welcome email with credentials
    async function sendWelcomeEmail(
      {
        clientEmail,
        clientName,
        agencyName,
        planName,
        tempPassword,
        onboardingUrl,
      },
    ) {
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
    .credentials-box { background: white; border: 2px solid #6366f1; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .credential-label { color: #64748b; font-size: 14px; }
    .credential-value { font-weight: bold; color: #1e293b; font-family: monospace; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .steps { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .step { display: flex; gap: 15px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .step-number { width: 28px; height: 28px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to NexVoice AI!</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${clientName}</strong>,</p>
      
      <p>Great news! Your <strong>${planName}</strong> package has been activated by <strong>${agencyName}</strong>. You now have access to our AI Voice Agent platform.</p>
      
      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #6366f1;">🔐 Your Login Credentials</h3>
        <div class="credential-row">
          <span class="credential-label">Email:</span>
          <span class="credential-value">${clientEmail}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Temporary Password:</span>
          <span class="credential-value">${tempPassword}</span>
        </div>
        <p style="color: #ef4444; font-size: 13px; margin-bottom: 0;">⚠️ Please change your password after first login</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${onboardingUrl}" class="cta-button">🚀 Start Onboarding</a>
      </div>
      
      <div class="steps">
        <h3 style="margin-top: 0;">📋 Quick Setup Guide (5 minutes)</h3>
        <div class="step">
          <div class="step-number">1</div>
          <div>
            <strong>Login & Change Password</strong>
            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Access your dashboard and set a secure password</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div>
            <strong>Complete Business Profile</strong>
            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Tell us about your business for personalized AI setup</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div>
            <strong>Create Your First AI Agent</strong>
            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Our AI wizard will help you build a voice agent in minutes</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">4</div>
          <div>
            <strong>Add Phone Number</strong>
            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Connect a phone number to start receiving AI-handled calls</p>
          </div>
        </div>
        <div class="step" style="border-bottom: none;">
          <div class="step-number">5</div>
          <div>
            <strong>Test & Go Live!</strong>
            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Make a test call and activate your agent</p>
          </div>
        </div>
      </div>
      
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #166534;">
          <strong>💡 Need Help?</strong> Our support team is available 24/7. Visit the Help Center in your dashboard or reply to this email.
        </p>
      </div>
      
      <p>We're excited to have you onboard!</p>
      <p>Best regards,<br><strong>The ${agencyName} Team</strong></p>
    </div>
    <div class="footer">
      <p>This email was sent because you purchased an AI Voice Agent package.</p>
      <p>© ${new Date().getFullYear()} ${agencyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      await base44.integrations.Core.SendEmail({
        to: clientEmail,
        subject: `🎉 Welcome! Your AI Voice Agent is Ready - Login Credentials Inside`,
        body: emailBody,
        from_name: agencyName,
      });

      return { sent: true };
    }

    // Main function: Process new client purchase
    async function processClientPurchase({
      agencyId,
      clientName,
      clientEmail,
      clientPhone,
      industry,
      planId,
      billingInfo,
    }) {
      // Get agency details
      const agencies = await base44.entities.Agency.filter({ id: agencyId });
      if (!agencies || agencies.length === 0) {
        throw new Error("Agency not found");
      }
      const agency = agencies[0];

      // Get plan details
      const plans = await base44.entities.Plan.filter({ id: planId });
      const plan = plans?.[0];

      // Generate credentials
      const tempPassword = generateTempPassword();
      const onboardingToken = generateOnboardingToken();

      // Create the client
      const client = await base44.entities.Client.create({
        agency_id: agencyId,
        name: clientName,
        slug: clientName.toLowerCase().replace(/\s+/g, "-").replace(
          /[^a-z0-9-]/g,
          "",
        ),
        industry: industry || "other",
        status: "pending",
        contact_name: clientName,
        contact_email: clientEmail,
        contact_phone: clientPhone,
        settings: {
          onboarding_token: onboardingToken,
          temp_password_hash: tempPassword, // In production, hash this
          password_changed: false,
          onboarding_completed: false,
        },
      });

      // Create wallet for the client
      const wallet = await base44.entities.Wallet.create({
        owner_type: "client",
        owner_id: client.id,
        credits_balance: plan?.included_minutes || 100,
        currency: "USD",
      });

      // Create subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await base44.entities.Subscription.create({
        client_id: client.id,
        plan_id: planId,
        status: "active",
        billing_cycle: "monthly",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

      // Create onboarding progress tracker
      await base44.entities.OnboardingProgress.create({
        user_id: clientEmail,
        agency_id: agencyId,
        current_step: 1,
        completed_steps: [],
        is_completed: false,
        collected_data: {
          business_name: clientName,
          industry: industry,
          contact_email: clientEmail,
          contact_phone: clientPhone,
        },
        started_at: now.toISOString(),
      });

      // Build onboarding URL
      const baseUrl = Deno.env.get("APP_URL") || "https://app.example.com";
      const onboardingUrl = `${baseUrl}/Onboarding?token=${onboardingToken}&email=${
        encodeURIComponent(clientEmail)
      }`;

      // Send welcome email with credentials
      await sendWelcomeEmail({
        clientEmail,
        clientName,
        agencyName: agency.name,
        planName: plan?.name || "Standard",
        tempPassword,
        onboardingUrl,
      });

      // Send notification to agency
      if (agency.settings?.billing_email || agency.primary_email) {
        await base44.integrations.Core.SendEmail({
          to: agency.settings?.billing_email || agency.primary_email,
          subject: `New Client Signup: ${clientName}`,
          body: `
            <h2>New Client Has Joined!</h2>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Plan:</strong> ${plan?.name || "Standard"}</p>
            <p><strong>Industry:</strong> ${industry || "Not specified"}</p>
            <p>The client has received their login credentials and onboarding instructions.</p>
          `,
          from_name: "VoiceAI Platform",
        });
      }

      return {
        success: true,
        client_id: client.id,
        wallet_id: wallet.id,
        onboarding_url: onboardingUrl,
        message: "Client created and welcome email sent",
      };
    }

    // Send onboarding reminder
    async function sendOnboardingReminder({ clientId }) {
      const clients = await base44.entities.Client.filter({ id: clientId });
      if (!clients || clients.length === 0) {
        throw new Error("Client not found");
      }
      const client = clients[0];

      const agencies = await base44.entities.Agency.filter({
        id: client.agency_id,
      });
      const agency = agencies?.[0];

      const progress = await base44.entities.OnboardingProgress.filter({
        user_id: client.contact_email,
      });

      const currentProgress = progress?.[0];
      const stepsCompleted = currentProgress?.completed_steps?.length || 0;

      await base44.integrations.Core.SendEmail({
        to: client.contact_email,
        subject: `⏰ Complete Your AI Voice Agent Setup - ${5 - stepsCompleted} Steps Remaining`,
        body: `
          <h2>Hi ${client.contact_name},</h2>
          <p>You're <strong>${stepsCompleted}/5 steps</strong> away from having your AI voice agent up and running!</p>
          <p>Complete your setup now to start handling calls automatically.</p>
          <p><a href="${
          Deno.env.get("APP_URL") || "https://app.example.com"
        }/Onboarding" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Continue Setup →</a></p>
          <p>Need help? Our team is here for you!</p>
          <p>Best,<br>${agency?.name || "The Team"}</p>
        `,
        from_name: agency?.name || "VoiceAI Platform",
      });

      return { sent: true };
    }

    // Mark onboarding step complete
    async function completeOnboardingStep({ userEmail, step }) {
      const progress = await base44.entities.OnboardingProgress.filter({
        user_id: userEmail,
      });

      if (!progress || progress.length === 0) {
        throw new Error("Onboarding progress not found");
      }

      const current = progress[0];
      const completedSteps = [...(current.completed_steps || [])];

      if (!completedSteps.includes(step)) {
        completedSteps.push(step);
      }

      const isCompleted = completedSteps.length >= 5;

      await base44.entities.OnboardingProgress.update(current.id, {
        completed_steps: completedSteps,
        current_step: Math.max(...completedSteps) + 1,
        is_completed: isCompleted,
        ...(isCompleted ? { completed_at: new Date().toISOString() } : {}),
      });

      // Update client status if completed
      if (isCompleted) {
        const clients = await base44.entities.Client.filter({
          contact_email: userEmail,
        });
        if (clients?.[0]) {
          await base44.entities.Client.update(clients[0].id, {
            status: "active",
          });
        }
      }

      return {
        completed_steps: completedSteps,
        is_completed: isCompleted,
      };
    }

    let result;
    switch (action) {
      case "processPurchase":
        result = await processClientPurchase(body);
        break;
      case "sendReminder":
        result = await sendOnboardingReminder(body);
        break;
      case "completeStep":
        result = await completeOnboardingStep(body);
        break;
      case "sendWelcomeEmail":
        result = await sendWelcomeEmail(body);
        break;
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    logger.error("Client onboarding failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});