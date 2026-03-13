import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference_id, reference_type } = await req.json();

    // Find notifications for this reference
    const notifications = await base44.asServiceRole.entities.AdminNotification
      .filter({
        reference_id,
        reference_type,
        status: "unread",
      });

    // Mark all as actioned
    for (const notification of notifications) {
      await base44.asServiceRole.entities.AdminNotification.update(
        notification.id,
        {
          status: "actioned",
          actioned_by: user.email,
          actioned_at: new Date().toISOString(),
        },
      );
    }

    return Response.json({
      success: true,
      marked: notifications.length,
    });
  } catch (error) {
    console.error("Mark notification error:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
