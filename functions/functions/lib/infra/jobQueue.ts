// lib/infra/jobQueue.js

import { logger } from "./logger.js";

/**
 * Enqueues a background job for async processing.
 * In production, this would connect to a proper job queue (Redis, SQS, etc.)
 * For now, it creates an AutomationJob entity for tracking.
 */
export async function enqueueJob(jobType, payload, base44 = null) {
  const jobId = crypto.randomUUID();

  logger.info("Job enqueued", {
    job_id: jobId,
    job_type: jobType,
    payload_keys: Object.keys(payload),
  });

  // If base44 client is provided, persist the job
  if (base44) {
    try {
      await base44.asServiceRole.entities.AutomationJob.create({
        type: jobType,
        status: "pending",
        attempts: 0,
        payload: {
          ...payload,
          job_id: jobId,
          enqueued_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.warn("Failed to persist job to database", {
        job_id: jobId,
        error: err.message,
      });
    }
  }

  return { job_id: jobId, status: "queued" };
}

/**
 * Updates job status
 */
export async function updateJobStatus(base44, jobId, status, result = null) {
  try {
    const jobs = await base44.asServiceRole.entities.AutomationJob.filter({
      "payload.job_id": jobId,
    });

    if (jobs.length > 0) {
      await base44.asServiceRole.entities.AutomationJob.update(jobs[0].id, {
        status,
        last_error: result?.error || null,
        attempts: (jobs[0].attempts || 0) + 1,
      });
    }
  } catch (err) {
    logger.error("Failed to update job status", {
      job_id: jobId,
      error: err.message,
    });
  }
}
