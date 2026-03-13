import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { otp_id, otp_code, email, phone } = await req.json();

    // Find OTP record
    const otpRecords = await base44.asServiceRole.entities.OTPVerification
      .filter({
        id: otp_id,
      });

    if (!otpRecords || otpRecords.length === 0) {
      return Response.json({
        success: false,
        error: "Invalid OTP request",
      }, { status: 400 });
    }

    const otpRecord = otpRecords[0];

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await base44.asServiceRole.entities.OTPVerification.update(otpRecord.id, {
        status: "expired",
      });
      return Response.json({
        success: false,
        error: "OTP has expired. Please request a new code.",
      }, { status: 400 });
    }

    // Check if already verified
    if (otpRecord.status === "verified") {
      return Response.json({
        success: false,
        error: "This code has already been used",
      }, { status: 400 });
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otp_code) {
      // Increment attempts
      const newAttempts = (otpRecord.attempts || 0) + 1;
      await base44.asServiceRole.entities.OTPVerification.update(otpRecord.id, {
        attempts: newAttempts,
        status: newAttempts >= 3 ? "failed" : "pending",
      });

      return Response.json({
        success: false,
        error: "Invalid code. Please try again.",
        attempts_remaining: Math.max(0, 3 - newAttempts),
      }, { status: 400 });
    }

    // Mark as verified
    await base44.asServiceRole.entities.OTPVerification.update(otpRecord.id, {
      status: "verified",
      verified_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: "Verification successful",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
