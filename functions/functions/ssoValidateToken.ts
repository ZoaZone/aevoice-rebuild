import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import * as jose from "npm:jose@5.2.0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { auth_token } = await req.json();

    if (!auth_token) {
      return Response.json({ valid: false, error: "Token required" }, {
        status: 400,
      });
    }

    const jwtSecret = Deno.env.get("HELLOBIZ_JWT_SECRET");

    if (!jwtSecret) {
      return Response.json({
        valid: false,
        error: "SSO secret not configured",
      }, { status: 500 });
    }

    // Verify JWT token
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(auth_token, secretKey);

    // Extract user data from payload
    const { email, name, unified_user_id, source } = payload;

    if (!email) {
      return Response.json({ valid: false, error: "Invalid token payload" }, {
        status: 401,
      });
    }

    // Check if user exists in AEVOICE
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      email,
    });

    if (existingUsers.length === 0) {
      return Response.json({
        valid: true,
        new_user: true,
        user_data: { email, name, unified_user_id, source },
        message: "User does not exist in AEVOICE - requires account creation",
      });
    }

    // Find HelloBiz agency client
    const hellobizAgency = await base44.asServiceRole.entities.Agency.filter({
      slug: "hellobiz",
    });

    if (hellobizAgency.length === 0) {
      return Response.json({
        valid: false,
        error: "HelloBiz agency not configured",
      }, { status: 404 });
    }

    const client = await base44.asServiceRole.entities.Client.filter({
      contact_email: email,
      agency_id: hellobizAgency[0].id,
    });

    return Response.json({
      valid: true,
      existing_user: true,
      user_id: existingUsers[0].id,
      user_data: {
        email: existingUsers[0].email,
        full_name: existingUsers[0].full_name,
        role: existingUsers[0].role,
      },
      client_id: client[0]?.id,
      agency_slug: "hellobiz",
      unified_user_id,
    });
  } catch (error) {
    console.error("SSO Validate Token Error:", error);

    if (error.code === "ERR_JWT_EXPIRED") {
      return Response.json({
        valid: false,
        error: "Token expired",
      }, { status: 401 });
    }

    return Response.json({
      valid: false,
      error: error instanceof Error ? error.message : String(error) || "Token validation failed",
    }, { status: 401 });
  }
});
