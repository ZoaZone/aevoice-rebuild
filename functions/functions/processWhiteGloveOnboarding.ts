import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const onboardingData = await req.json();

    // Send comprehensive email to implementation team
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; color: white; }
          .section { background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .label { font-weight: bold; color: #64748b; }
          .value { margin-left: 10px; color: #0f172a; }
          .file-list { list-style: none; padding: 0; }
          .file-list li { padding: 5px 0; }
          .highlight { background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 New White-Glove Setup Request</h1>
          <p>$100 Premium Service - HelloBiz Integration</p>
        </div>

        <div class="section">
          <h2>📋 Business Information</h2>
          <p><span class="label">Company Name:</span><span class="value">${onboardingData.business_name}</span></p>
          <p><span class="label">Industry:</span><span class="value">${onboardingData.industry}</span></p>
          <p><span class="label">Email:</span><span class="value">${onboardingData.business_email}</span></p>
          <p><span class="label">Phone:</span><span class="value">${onboardingData.business_phone}</span></p>
          <p><span class="label">Website:</span><span class="value">${
      onboardingData.website_url || "Not provided"
    }</span></p>
          <p><span class="label">Business Hours:</span><span class="value">${onboardingData.business_hours}</span></p>
          ${
      onboardingData.logo_url
        ? `<p><span class="label">Logo:</span><span class="value"><a href="${onboardingData.logo_url}">View Logo</a></span></p>`
        : ""
    }
          <p><span class="label">Brand Colors:</span><span class="value">Primary: ${
      onboardingData.brand_colors?.primary || "#6366f1"
    } | Secondary: ${onboardingData.brand_colors?.secondary || "#8b5cf6"} | Accent: ${
      onboardingData.brand_colors?.accent || "#06b6d4"
    }</span></p>
        </div>

        ${
      onboardingData.social_media
        ? `
        <div class="section">
          <h2>📱 Social Media</h2>
          ${
          onboardingData.social_media.facebook
            ? `<p>Facebook: ${onboardingData.social_media.facebook}</p>`
            : ""
        }
          ${
          onboardingData.social_media.instagram
            ? `<p>Instagram: ${onboardingData.social_media.instagram}</p>`
            : ""
        }
          ${
          onboardingData.social_media.linkedin
            ? `<p>LinkedIn: ${onboardingData.social_media.linkedin}</p>`
            : ""
        }
          ${
          onboardingData.social_media.twitter
            ? `<p>Twitter/X: ${onboardingData.social_media.twitter}</p>`
            : ""
        }
        </div>
        `
        : ""
    }

        <div class="section">
          <h2>📚 Knowledge Base & Documents</h2>
          <p><span class="label">Uploaded Documents:</span><span class="value">${
      onboardingData.uploaded_documents?.length || 0
    } files</span></p>
          ${
      onboardingData.uploaded_documents?.length > 0
        ? `
          <ul class="file-list">
            ${
          onboardingData.uploaded_documents.map((doc) =>
            `<li>• ${doc.name} - <a href="${doc.url}">Download</a></li>`
          ).join("")
        }
          </ul>
          `
        : ""
    }
          ${
      onboardingData.knowledge_content
        ? `<p><span class="label">Additional Content:</span><span class="value">${onboardingData.knowledge_content}</span></p>`
        : ""
    }
          ${
      onboardingData.import_urls?.length > 0
        ? `
          <p><span class="label">URLs to Import:</span></p>
          <ul>
            ${onboardingData.import_urls.map((url) => `<li>${url}</li>`).join("")}
          </ul>
          `
        : ""
    }
        </div>

        <div class="section">
          <h2>🔗 Integrations</h2>
          <p><span class="label">CRM System:</span><span class="value">${onboardingData.crm_system}</span></p>
          ${
      onboardingData.crm_credentials
        ? `<p><span class="label">CRM Details:</span><span class="value">${onboardingData.crm_credentials}</span></p>`
        : ""
    }
          <p><span class="label">Calendar System:</span><span class="value">${onboardingData.calendar_system}</span></p>
          ${
      onboardingData.calendar_details
        ? `<p><span class="label">Calendar Details:</span><span class="value">${onboardingData.calendar_details}</span></p>`
        : ""
    }
          ${
      onboardingData.booking_preferences
        ? `<p><span class="label">Booking Preferences:</span><span class="value">${onboardingData.booking_preferences}</span></p>`
        : ""
    }
          <p><span class="label">Time Zone:</span><span class="value">${onboardingData.timezone}</span></p>
        </div>

        <div class="section">
          <h2>🛠️ Current Platforms & Tools</h2>
          ${
      onboardingData.email_platform
        ? `<p><span class="label">Email:</span><span class="value">${onboardingData.email_platform}</span></p>`
        : ""
    }
          ${
      onboardingData.communication_tools?.length > 0
        ? `<p><span class="label">Communication:</span><span class="value">${
          onboardingData.communication_tools.join(", ")
        }</span></p>`
        : ""
    }
          ${
      onboardingData.ecommerce_platform
        ? `<p><span class="label">E-commerce:</span><span class="value">${onboardingData.ecommerce_platform}</span></p>`
        : ""
    }
          ${
      onboardingData.payment_processor
        ? `<p><span class="label">Payments:</span><span class="value">${onboardingData.payment_processor}</span></p>`
        : ""
    }
          ${
      onboardingData.appointment_system
        ? `<p><span class="label">Appointments:</span><span class="value">${onboardingData.appointment_system}</span></p>`
        : ""
    }
          ${
      onboardingData.current_workflows
        ? `
          <div class="highlight">
            <p><strong>Current Manual Workflows:</strong></p>
            <p>${onboardingData.current_workflows}</p>
          </div>
          `
        : ""
    }
          ${
      onboardingData.automation_goals
        ? `
          <div class="highlight">
            <p><strong>Automation Goals:</strong></p>
            <p>${onboardingData.automation_goals}</p>
          </div>
          `
        : ""
    }
        </div>

        <div class="section">
          <h2>🎙️ Voice Configuration</h2>
          <p><span class="label">Voice:</span><span class="value">${onboardingData.voice_preference} • ${onboardingData.voice_accent} accent</span></p>
          <p><span class="label">Greeting:</span><span class="value">"${onboardingData.greeting_message}"</span></p>
          ${
      onboardingData.call_scripts?.length > 0
        ? `
          <p><span class="label">Call Scripts:</span></p>
          <ul>
            ${
          onboardingData.call_scripts.map((script) =>
            `<li><a href="${script.url}">${script.name}</a></li>`
          ).join("")
        }
          </ul>
          `
        : ""
    }
          ${
      onboardingData.escalation_protocol
        ? `<p><span class="label">Escalation Protocol:</span><span class="value">${onboardingData.escalation_protocol}</span></p>`
        : ""
    }
          ${
      onboardingData.after_hours_message
        ? `<p><span class="label">After-Hours:</span><span class="value">"${onboardingData.after_hours_message}"</span></p>`
        : ""
    }
        </div>

        <div class="section">
          <h2>🏪 HelloBiz Service Listings</h2>
          ${
      onboardingData.service_categories?.length > 0
        ? `<p><span class="label">Categories:</span><span class="value">${
          onboardingData.service_categories.join(", ")
        }</span></p>`
        : ""
    }
          ${
      onboardingData.pricing_structure
        ? `<p><span class="label">Services:</span><span class="value">${onboardingData.pricing_structure}</span></p>`
        : ""
    }
          ${
      onboardingData.service_areas
        ? `<p><span class="label">Service Areas:</span><span class="value">${onboardingData.service_areas}</span></p>`
        : ""
    }
          ${
      onboardingData.service_images?.length > 0
        ? `<p><span class="label">Service Images:</span><span class="value">${onboardingData.service_images.length} uploaded</span></p>`
        : ""
    }
          ${
      onboardingData.testimonials
        ? `<p><span class="label">Testimonials:</span><span class="value">${onboardingData.testimonials}</span></p>`
        : ""
    }
        </div>

        <div class="section">
          <h2>⏰ Implementation Details</h2>
          <p><span class="label">Preferred Contact:</span><span class="value">${onboardingData.preferred_contact}</span></p>
          <p><span class="label">Best Time for Call:</span><span class="value">${
      onboardingData.best_time_for_call || "Anytime"
    }</span></p>
          <p><span class="label">Timeline:</span><span class="value">${onboardingData.implementation_timeline}</span></p>
        </div>

        <div class="section" style="background: #dbeafe; border: 2px solid #3b82f6;">
          <h2 style="color: #1e40af;">✅ Implementation Checklist</h2>
          <ul>
            <li>☐ Review all submitted information</li>
            <li>☐ Schedule setup call with client</li>
            <li>☐ Configure AEVOICE AI agent</li>
            <li>☐ Set up CRM integration (${onboardingData.crm_system})</li>
            <li>☐ Connect calendar system (${onboardingData.calendar_system})</li>
            <li>☐ Configure FlowSync workflows</li>
            <li>☐ Create HelloBiz service listings</li>
            <li>☐ Test all integrations</li>
            <li>☐ Send credentials and onboarding link</li>
          </ul>
        </div>
      </body>
      </html>
    `;

    // Send to implementation team
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "vetnpet@gmail.com",
      from_name: "AEVOICE White-Glove",
      subject:
        `🚀 NEW WHITE-GLOVE SETUP: ${onboardingData.business_name} - ${onboardingData.industry}`,
      body: emailBody,
    });

    // Send confirmation to client
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: onboardingData.business_email,
      from_name: "AEVOICE Team",
      subject: `✅ White-Glove Setup Received - ${onboardingData.business_name}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
            <h1>Thank You for Choosing AEVOICE!</h1>
          </div>
          <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
            <h2>Hi ${onboardingData.business_name},</h2>
            <p>We've received your white-glove setup request and our implementation team is already reviewing your information.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>⏰ What to Expect:</h3>
              <ul style="line-height: 2;">
                <li>✅ Setup call scheduled within 24 hours</li>
                <li>✅ AI voice agent configured with your preferences</li>
                <li>✅ All integrations connected (CRM, Calendar, etc.)</li>
                <li>✅ FlowSync workflows automated</li>
                <li>✅ HelloBiz marketplace listing created</li>
                <li>✅ Full platform ready in 48-72 hours</li>
              </ul>
            </div>

            <p>We'll contact you via <strong>${onboardingData.preferred_contact}</strong> ${
        onboardingData.best_time_for_call
          ? `at your preferred time (${onboardingData.best_time_for_call})`
          : "soon"
      }.</p>

            <p>Questions? Reply to this email or call us at +1 (555) 000-0000</p>
            
            <p>Best regards,<br><strong>AEVOICE Implementation Team</strong></p>
          </div>
        </div>
      `,
    });

    // Create admin notification
    await base44.asServiceRole.entities.AdminNotification.create({
      title: `New White-Glove Setup: ${onboardingData.business_name}`,
      message:
        `${onboardingData.business_name} (${onboardingData.industry}) submitted white-glove onboarding. Timeline: ${onboardingData.implementation_timeline}. Contact: ${onboardingData.business_email}`,
      type: "white_glove_setup",
      priority: "high",
      status: "unread",
      action_url: `/admin/onboarding/${onboardingData.business_email}`,
      metadata: onboardingData,
    });

    return Response.json({
      success: true,
      message: "White-glove setup request submitted successfully",
      emails_sent: 2,
      next_steps: [
        "Setup call scheduled within 24 hours",
        "Implementation team will contact you",
        "Platform ready in 48-72 hours",
      ],
    });
  } catch (error) {
    console.error("White-Glove Processing Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      details: "Failed to process white-glove onboarding",
    }, { status: 500 });
  }
});
