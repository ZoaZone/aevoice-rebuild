// functions/appointmentReminders.js
// Appointment reminder worker - sends 24h and 1h reminders

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can trigger reminder worker
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Fetch upcoming appointments
    const appointments = await base44.asServiceRole.entities.Appointment.filter(
      {
        status: { $in: ["scheduled", "confirmed"] },
      },
    );

    const results = {
      reminders_24h_sent: 0,
      reminders_1h_sent: 0,
      errors: [],
    };

    for (const apt of appointments) {
      const aptDate = new Date(apt.appointment_date);

      // 24h reminder: appointment is between 24-25 hours away
      if (
        !apt.reminder_24h_sent &&
        aptDate > in24h &&
        aptDate < in25h
      ) {
        try {
          await sendReminder(base44, apt, "24h");
          await base44.asServiceRole.entities.Appointment.update(apt.id, {
            reminder_24h_sent: true,
            status: "reminded",
          });
          results.reminders_24h_sent++;

          // Trigger FlowSync event
          await triggerFlowSyncEvent(base44, "appointment_reminded", {
            appointment_id: apt.id,
            customer_email: apt.customer_email,
            customer_phone: apt.customer_phone,
            reminder_type: "24h",
          });
        } catch (err) {
          results.errors.push({
            appointment_id: apt.id,
            type: "24h",
            error: err.message,
          });
        }
      }

      // 1h reminder: appointment is between 1-2 hours away
      if (
        !apt.reminder_1h_sent &&
        aptDate > in1h &&
        aptDate < in2h
      ) {
        try {
          await sendReminder(base44, apt, "1h");
          await base44.asServiceRole.entities.Appointment.update(apt.id, {
            reminder_1h_sent: true,
          });
          results.reminders_1h_sent++;

          await triggerFlowSyncEvent(base44, "appointment_reminded", {
            appointment_id: apt.id,
            customer_email: apt.customer_email,
            customer_phone: apt.customer_phone,
            reminder_type: "1h",
          });
        } catch (err) {
          results.errors.push({
            appointment_id: apt.id,
            type: "1h",
            error: err.message,
          });
        }
      }
    }

    logger.info("Appointment reminders processed", {
      request_id: requestId,
      ...results,
    });

    return Response.json({
      success: true,
      request_id: requestId,
      ...results,
    });
  } catch (err) {
    logger.error("appointmentReminders failed", {
      request_id: requestId,
      error: err.message,
    });

    return Response.json({ success: false, error: err.message }, {
      status: 500,
    });
  }
});

async function sendReminder(base44, appointment, type) {
  const aptDate = new Date(appointment.appointment_date);
  const formattedDate = aptDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = aptDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const subject = type === "24h"
    ? `Reminder: Your appointment tomorrow at ${formattedTime}`
    : `Reminder: Your appointment in 1 hour`;

  const body = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0e4166;">Appointment Reminder</h2>
      <p>Hi ${appointment.customer_name || "there"},</p>
      <p>This is a reminder about your upcoming appointment:</p>
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedTime}</p>
        ${
    appointment.service_type
      ? `<p style="margin: 4px 0;"><strong>Service:</strong> ${appointment.service_type}</p>`
      : ""
  }
        ${
    appointment.location
      ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${appointment.location}</p>`
      : ""
  }
        ${
    appointment.meeting_url
      ? `<p style="margin: 4px 0;"><strong>Join Link:</strong> <a href="${appointment.meeting_url}">${appointment.meeting_url}</a></p>`
      : ""
  }
      </div>
      ${
    appointment.calendar_link
      ? `<p><a href="${appointment.calendar_link}" style="color: #0e4166;">Add to Calendar</a></p>`
      : ""
  }
      <p style="color: #64748b; font-size: 14px;">If you need to reschedule or cancel, please contact us.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Powered by AEVOICE</p>
    </div>
  `;

  // Send email
  if (appointment.customer_email) {
    await base44.integrations.Core.SendEmail({
      to: appointment.customer_email,
      subject,
      body,
      from_name: "AEVOICE Appointments",
    });

    // Track usage
    await base44.asServiceRole.entities.CommunicationUsage.create({
      client_id: appointment.client_id,
      type: "email",
      direction: "outbound",
      recipient: appointment.customer_email,
      sent_at: new Date().toISOString(),
      status: "sent",
      unit_cost: 0.001,
      total_cost: 0.001,
      metadata: {
        appointment_id: appointment.id,
        reminder_type: type,
      },
    });
  }

  // Optionally send SMS for 1h reminder
  if (type === "1h" && appointment.customer_phone) {
    const smsMessage = `Reminder: Your appointment is in 1 hour at ${formattedTime}. ${
      appointment.meeting_url ? `Join: ${appointment.meeting_url}` : ""
    }`;

    // SMS would be sent here via Twilio
    // await sendSms(appointment.customer_phone, smsMessage);
  }
}

async function triggerFlowSyncEvent(base44, eventType, eventData) {
  try {
    await base44.functions.invoke("flowSyncEngine", {
      action: "trigger_event",
      event_type: eventType,
      event_data: eventData,
    });
  } catch (err) {
    // Best effort - don't fail reminder if FlowSync fails
    logger.warn("FlowSync event trigger failed", { error: err.message });
  }
}
