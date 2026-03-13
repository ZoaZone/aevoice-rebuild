import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

/*
 * RECORDING CLEANUP & REMINDER SYSTEM
 *
 * This function handles:
 * 1. Sending reminder emails 3 days before deletion
 * 2. Auto-deleting recordings based on retention policy
 * 3. Transferring recordings to client's designated server
 *
 * Retention policies:
 * - daily: 24 hours
 * - weekly: 7 days
 * - monthly: 30 days (default)
 *
 * After 30 days, ALL recordings are permanently deleted regardless of policy.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    if (action === "sendReminders") {
      // Find recordings approaching deletion
      const now = new Date();
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000,
      );

      const recordings = await base44.asServiceRole.entities.CallRecording
        .list();
      const subscriptions = await base44.asServiceRole.entities
        .RecordingSubscription.list();
      const clients = await base44.asServiceRole.entities.Client.list();

      const remindersToSend = [];

      for (const recording of recordings) {
        if (recording.reminder_sent) continue;

        const subscription = subscriptions.find((s) => s.client_id === recording.client_id);
        if (!subscription) continue;

        const retentionDays = {
          "daily": 1,
          "weekly": 7,
          "monthly": 30,
        }[subscription.retention_policy || "monthly"] || 30;

        const createdDate = new Date(recording.created_date);
        const deleteDate = new Date(
          createdDate.getTime() + retentionDays * 24 * 60 * 60 * 1000,
        );
        const reminderDate = new Date(
          deleteDate.getTime() - 3 * 24 * 60 * 60 * 1000,
        );

        if (now >= reminderDate && now < deleteDate) {
          const client = clients.find((c) => c.id === recording.client_id);
          if (client?.contact_email) {
            remindersToSend.push({
              recording,
              client,
              deleteDate,
            });
          }
        }
      }

      // Send reminder emails
      for (const { recording, client, deleteDate } of remindersToSend) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: client.contact_email,
          subject: `⚠️ Recording Deletion Reminder - ${deleteDate.toLocaleDateString()}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f59e0b; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
                <h2 style="color: white; margin: 0;">📁 Recording Deletion Notice</h2>
              </div>
              <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
                <p>Hi ${client.name || client.contact_name},</p>
                
                <p>Your call recording will be automatically deleted on <strong>${deleteDate.toLocaleDateString()}</strong> (in 3 days).</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 15px 0;"><strong>Recording ID:</strong> ${recording.id}</p>
                  <p style="margin: 0 0 15px 0;"><strong>Duration:</strong> ${
            Math.round(recording.recording_duration_seconds / 60)
          } minutes</p>
                  <a href="${recording.recording_url}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Download Recording
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 14px;">
                  After deletion, this recording cannot be recovered. Please download or transfer it before the deadline.
                </p>
                
                <p>Best regards,<br><strong>AEVOICE Team</strong></p>
              </div>
            </div>
          `,
          from_name: "AEVOICE",
        });

        // Mark reminder as sent
        await base44.asServiceRole.entities.CallRecording.update(recording.id, {
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
        });
      }

      return Response.json({
        success: true,
        remindersSent: remindersToSend.length,
      });
    }

    if (action === "deleteExpired") {
      const now = new Date();
      const recordings = await base44.asServiceRole.entities.CallRecording
        .list();
      const subscriptions = await base44.asServiceRole.entities
        .RecordingSubscription.list();

      let deletedCount = 0;

      for (const recording of recordings) {
        if (recording.is_archived) continue;

        const subscription = subscriptions.find((s) => s.client_id === recording.client_id);
        const retentionDays = subscription
          ? {
            "daily": 1,
            "weekly": 7,
            "monthly": 30,
          }[subscription.retention_policy || "monthly"] || 30
          : 30;

        const createdDate = new Date(recording.created_date);
        const deleteDate = new Date(
          createdDate.getTime() + retentionDays * 24 * 60 * 60 * 1000,
        );

        // Also enforce 30-day maximum regardless of policy
        const maxDeleteDate = new Date(
          createdDate.getTime() + 30 * 24 * 60 * 60 * 1000,
        );

        if (now >= deleteDate || now >= maxDeleteDate) {
          // Delete recording
          await base44.asServiceRole.entities.CallRecording.delete(
            recording.id,
          );
          deletedCount++;
        }
      }

      return Response.json({
        success: true,
        deletedCount,
      });
    }

    if (action === "transferToServer") {
      const { clientId, recordingId } = body;

      const recordings = await base44.asServiceRole.entities.CallRecording
        .filter({ id: recordingId });
      const recording = recordings?.[0];

      if (!recording) {
        return Response.json({ error: "Recording not found" }, { status: 404 });
      }

      const subscriptions = await base44.asServiceRole.entities
        .RecordingSubscription.filter({
          client_id: clientId,
        });
      const subscription = subscriptions?.[0];

      if (!subscription?.transfer_enabled || !subscription?.server_details) {
        return Response.json({ error: "Server transfer not configured" }, {
          status: 400,
        });
      }

      // Note: Actual transfer would require integration with client's server
      // This is a placeholder for the transfer logic
      // You would implement SFTP/S3/Azure Blob upload here based on server_details

      await base44.asServiceRole.entities.CallRecording.update(recordingId, {
        transferred_to_server: true,
        transferred_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        message: "Recording marked for transfer",
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Recording cleanup failed", {
      request_id: requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "",
    });
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
