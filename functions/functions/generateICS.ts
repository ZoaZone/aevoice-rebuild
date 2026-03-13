// functions/generateICS.js
// Generate ICS calendar files for appointments

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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);

    let appointmentId;

    if (req.method === "GET") {
      const url = new URL(req.url);
      appointmentId = url.searchParams.get("appointment_id");
    } else {
      const body = await req.json();
      appointmentId = body.appointment_id;
    }

    if (!appointmentId) {
      return Response.json({ error: "appointment_id required" }, {
        status: 400,
      });
    }

    // Fetch appointment
    const appointments = await base44.asServiceRole.entities.Appointment.filter(
      {
        id: appointmentId,
      },
    );
    const appointment = appointments[0];

    if (!appointment) {
      return Response.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Generate ICS content
    const icsContent = generateICSContent(appointment);

    // Return as downloadable file
    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="appointment-${appointmentId}.ics"`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    logger.error("generateICS failed", {
      request_id: requestId,
      error: err.message,
    });

    return Response.json({ success: false, error: err.message }, {
      status: 500,
    });
  }
});

function generateICSContent(appointment) {
  const uid = `appointment-${appointment.id}@aevoice.ai`;
  const now = formatICSDate(new Date());

  const startDate = new Date(appointment.appointment_date);
  const endDate = appointment.end_date ? new Date(appointment.end_date) : new Date(
    startDate.getTime() + (appointment.duration_minutes || 30) * 60000,
  );

  const dtstart = formatICSDate(startDate);
  const dtend = formatICSDate(endDate);

  const summary = appointment.service_type || "Appointment";
  const description = [
    appointment.notes || "",
    appointment.meeting_url ? `Join: ${appointment.meeting_url}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const location = appointment.location || appointment.meeting_url || "";

  const organizer = "AEVOICE";
  const attendeeName = appointment.customer_name || "Guest";
  const attendeeEmail = appointment.customer_email || "";

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AEVOICE//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(summary)}`,
    description ? `DESCRIPTION:${escapeICS(description)}` : "",
    location ? `LOCATION:${escapeICS(location)}` : "",
    `ORGANIZER;CN=${organizer}:mailto:appointments@aevoice.ai`,
    attendeeEmail ? `ATTENDEE;CN=${attendeeName};RSVP=TRUE:mailto:${attendeeEmail}` : "",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment reminder",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return icsLines.filter(Boolean).join("\r\n");
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
