import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete client records belonging to this user
    const clients = await base44.asServiceRole.entities.Client.filter({ contact_email: user.email });
    for (const client of clients) {
      // Delete agents
      const agents = await base44.asServiceRole.entities.Agent.filter({ client_id: client.id });
      for (const agent of agents) {
        await base44.asServiceRole.entities.Agent.delete(agent.id);
      }
      // Delete knowledge bases
      const kbs = await base44.asServiceRole.entities.KnowledgeBase.filter({ client_id: client.id });
      for (const kb of kbs) {
        await base44.asServiceRole.entities.KnowledgeBase.delete(kb.id);
      }
      // Delete call sessions
      const calls = await base44.asServiceRole.entities.CallSession.filter({ client_id: client.id });
      for (const call of calls) {
        await base44.asServiceRole.entities.CallSession.delete(call.id);
      }
      // Delete subscriptions
      const subs = await base44.asServiceRole.entities.Subscription.filter({ client_id: client.id });
      for (const sub of subs) {
        await base44.asServiceRole.entities.Subscription.delete(sub.id);
      }
      // Delete the client itself
      await base44.asServiceRole.entities.Client.delete(client.id);
    }

    // Send confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: "Your AEVOICE account has been deleted",
      body: `Hi ${user.full_name || 'there'},\n\nYour AEVOICE account and all associated data have been permanently deleted as requested.\n\nIf you did not request this, please contact support immediately.\n\nThank you for using AEVOICE.`,
    });

    return Response.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});