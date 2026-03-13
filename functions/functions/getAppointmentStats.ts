// functions/getAppointmentStats.js
// Returns appointment statistics for a client

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { logger } from "./lib/infra/logger.js";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return jsonError({
      error_code: "METHOD_NOT_ALLOWED",
      error: "Method not allowed",
      request_id: requestId,
    }, 405);
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return jsonError({
        error_code: "UNAUTHORIZED",
        error: "Authentication required",
      }, 401);
    }

    // Get client for user
    const clients = await base44.entities.Client.filter({
      contact_email: user.email,
    });
    const client = clients[0];

    if (!client) {
      return jsonError(
        { error_code: "NO_CLIENT", error: "No client found" },
        404,
      );
    }

    // Fetch appointments
    const appointments = await base44.entities.Appointment.filter({
      client_id: client.id,
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const stats = {
      total: appointments.length,
      upcoming: 0,
      today: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      confirmed: 0,
      scheduled: 0,
    };

    for (const apt of appointments) {
      const d = new Date(apt.appointment_date);
      const dateStr = d.toISOString().slice(0, 10);

      // Count by status
      if (apt.status === "completed") stats.completed++;
      if (apt.status === "cancelled") stats.cancelled++;
      if (apt.status === "no_show") stats.no_show++;
      if (apt.status === "confirmed") stats.confirmed++;
      if (apt.status === "scheduled") stats.scheduled++;

      // Upcoming (future, not cancelled/no_show)
      if (
        d > now && apt.status !== "cancelled" && apt.status !== "no_show" &&
        apt.status !== "completed"
      ) {
        stats.upcoming++;
      }

      // Today's appointments
      if (dateStr === todayStr) {
        stats.today++;
      }
    }

    logger.info("Appointment stats fetched", {
      request_id: requestId,
      client_id: client.id,
      total: stats.total,
    });

    return new Response(
      JSON.stringify({ success: true, stats, request_id: requestId }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    logger.error("getAppointmentStats failed", {
      request_id: requestId,
      error: err.message,
    });

    return jsonError({
      error_code: "INTERNAL_ERROR",
      error: err.message,
      request_id: requestId,
    }, 500);
  }
});

function jsonError(body, status = 400) {
  return new Response(JSON.stringify({ success: false, ...body }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
