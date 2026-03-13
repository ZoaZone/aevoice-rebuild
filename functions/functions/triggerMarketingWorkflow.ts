import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { trigger_type, data, client_id } = await req.json();

    if (!trigger_type || !client_id) {
      return Response.json({ error: "trigger_type and client_id required" }, {
        status: 400,
      });
    }

    // Get active workflows for this trigger
    const workflows = await base44.asServiceRole.entities.MarketingWorkflow
      .filter({
        client_id,
        trigger_type,
        status: "active",
      });

    const results = [];

    for (const workflow of workflows) {
      // Check trigger conditions
      if (workflow.trigger_conditions) {
        const conditionsMet = Object.entries(workflow.trigger_conditions).every(
          ([key, value]) => data[key] === value,
        );
        if (!conditionsMet) continue;
      }

      // Execute actions
      for (const action of workflow.actions || []) {
        // Wait if delay specified
        if (action.delay_minutes > 0) {
          // In production, use a queue system. For now, skip delays > 5 min
          if (action.delay_minutes <= 5) {
            await new Promise((resolve) => setTimeout(resolve, action.delay_minutes * 60 * 1000));
          }
        }

        try {
          switch (action.type) {
            case "send_email":
              await base44.integrations.Core.SendEmail({
                to: data.customer_email || action.config.to,
                subject: action.config.subject,
                body: action.config.body
                  .replace("{customer_name}", data.customer_name || "")
                  .replace("{appointment_date}", data.appointment_date || "")
                  .replace("{appointment_time}", data.appointment_time || ""),
              });
              break;

            case "send_sms":
              // SMS integration would go here
              console.log("SMS action:", action.config);
              break;

            case "create_task":
              // Create admin task/notification
              await base44.asServiceRole.entities.AdminNotification.create({
                type: "task",
                priority: "normal",
                title: action.config.title,
                message: action.config.message,
                metadata: data,
              });
              break;

            case "update_contact":
              // Update contact in MarketingContact
              const contacts = await base44.asServiceRole.entities
                .MarketingContact.filter({
                  client_id,
                  email: data.customer_email,
                });
              if (contacts[0]) {
                await base44.asServiceRole.entities.MarketingContact.update(
                  contacts[0].id,
                  {
                    ...action.config.updates,
                    last_contacted_at: new Date().toISOString(),
                  },
                );
              }
              break;

            case "webhook":
              // Send webhook to external system
              await fetch(action.config.url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(action.config.headers || {}),
                },
                body: JSON.stringify(data),
              });
              break;
          }

          results.push({ action: action.type, success: true });
        } catch (error) {
          results.push({
            action: action.type,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Update workflow stats
      await base44.asServiceRole.entities.MarketingWorkflow.update(
        workflow.id,
        {
          runs_count: (workflow.runs_count || 0) + 1,
          success_count: (workflow.success_count || 0) + 1,
        },
      );
    }

    return Response.json({
      success: true,
      workflows_triggered: workflows.length,
      results,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
