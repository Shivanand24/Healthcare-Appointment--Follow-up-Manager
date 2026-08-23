/**
 * Async Queue Engine
 * 
 * Supports two modes:
 * 1. BullMQ (Redis) — production mode (set REDIS_URL)
 * 2. In-process async fallback — local dev without Redis
 */

import { db } from "@/lib/db";
import { sendEmail, bookingConfirmationEmail, cancellationEmail, medicationReminderEmail } from "@/lib/mailer";
import { syncCalendarEvent, deleteCalendarEvent } from "@/lib/calendar";
import { NotificationChannel, NotificationStatus } from "@prisma/client";

// ─── Job Types ────────────────────────────────────────────────────────────────

export type JobType =
  | "BOOKING_CONFIRMATION"
  | "CANCELLATION"
  | "MEDICATION_REMINDER"
  | "CALENDAR_SYNC"
  | "CALENDAR_DELETE";

export interface NotificationJob {
  type: JobType;
  appointmentId?: string;
  notificationAuditId?: string;
  payload: Record<string, unknown>;
  retryCount?: number;
}

// ─── Exponential Backoff ──────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1m, 5m, 15m

async function withRetry(
  fn: () => Promise<void>,
  auditId: string,
  retryCount = 0
): Promise<void> {
  try {
    await fn();
    await db.notificationAudit.update({
      where: { id: auditId },
      data: { status: NotificationStatus.SENT, sentAt: new Date(), retryCount },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Notification job failed (attempt ${retryCount + 1}):`, errorMessage);

    if (retryCount < RETRY_DELAYS_MS.length) {
      await db.notificationAudit.update({
        where: { id: auditId },
        data: {
          retryCount: retryCount + 1,
          errorLog: errorMessage,
          status: NotificationStatus.QUEUED,
        },
      });

      const delay = RETRY_DELAYS_MS[retryCount];
      console.log(`Retrying in ${delay / 1000}s...`);
      setTimeout(() => withRetry(fn, auditId, retryCount + 1), delay);
    } else {
      await db.notificationAudit.update({
        where: { id: auditId },
        data: {
          status: NotificationStatus.DEAD_LETTER,
          errorLog: `Max retries exceeded. Last error: ${errorMessage}`,
          retryCount,
        },
      });
    }
  }
}

// ─── Job Processor ────────────────────────────────────────────────────────────

export async function processJob(job: NotificationJob): Promise<void> {
  const { type, appointmentId, payload } = job;

  // Create or fetch audit record
  let auditId = job.notificationAuditId;
  if (!auditId) {
    const audit = await db.notificationAudit.create({
      data: {
        appointmentId: appointmentId || null,
        type,
        channel: type === "CALENDAR_SYNC" || type === "CALENDAR_DELETE"
          ? NotificationChannel.CALENDAR
          : NotificationChannel.EMAIL,
        status: NotificationStatus.QUEUED,
      },
    });
    auditId = audit.id;
  }

  await withRetry(async () => {
    switch (type) {
      case "BOOKING_CONFIRMATION": {
        const template = bookingConfirmationEmail({
          patientName: String(payload.patientName),
          doctorName: String(payload.doctorName),
          date: String(payload.date),
          time: String(payload.time),
          specialization: String(payload.specialization),
        });
        template.to = String(payload.patientEmail);
        await sendEmail(template);
        break;
      }

      case "CANCELLATION": {
        const template = cancellationEmail({
          patientName: String(payload.patientName),
          doctorName: String(payload.doctorName),
          date: String(payload.date),
          time: String(payload.time),
          reason: payload.reason ? String(payload.reason) : undefined,
        });
        template.to = String(payload.patientEmail);
        await sendEmail(template);
        break;
      }

      case "MEDICATION_REMINDER": {
        const template = medicationReminderEmail({
          patientName: String(payload.patientName),
          medications: payload.medications as Array<{
            name: string;
            dosage: string;
            frequency: string;
          }>,
        });
        template.to = String(payload.patientEmail);
        await sendEmail(template);
        break;
      }

      case "CALENDAR_SYNC": {
        console.log(`📅 Calendar SYNC job for appointment ${appointmentId}`);
        await syncCalendarEvent({
          appointmentId: String(appointmentId),
          patientEmail: String(payload.patientEmail),
          doctorEmail: String(payload.doctorEmail),
          patientName: String(payload.patientName),
          doctorName: String(payload.doctorName),
          specialization: String(payload.specialization),
          date: String(payload.date),
          startTime: String(payload.startTime),
          endTime: String(payload.endTime),
        });
        break;
      }
      
      case "CALENDAR_DELETE": {
        console.log(`🗑 Calendar DELETE job for appointment ${appointmentId}`);
        await deleteCalendarEvent(String(appointmentId));
        break;
      }
    }
  }, auditId, job.retryCount ?? 0);
}

// ─── Queue Entry Point ────────────────────────────────────────────────────────

export async function enqueueJob(job: NotificationJob): Promise<void> {
  if (process.env.REDIS_URL) {
    // BullMQ path (production)
    try {
      const { Queue } = await import("bullmq");
      const { Redis } = await import("ioredis");

      const connection = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
      });

      const queue = new Queue("notifications", { connection });
      await queue.add(job.type, job, {
        attempts: 3,
        backoff: { type: "exponential", delay: 60000 },
        removeOnComplete: true,
        removeOnFail: 50,
      });

      console.log(`📬 Job enqueued to Redis: ${job.type}`);
    } catch (err) {
      console.error("Redis queue error, falling back to in-process:", err);
      // Fall through to in-process
      setImmediate(() => processJob(job));
    }
  } else {
    // In-process async fallback (dev)
    console.log(`📬 [DEV] Processing job in-process: ${job.type}`);
    setImmediate(() => processJob(job));
  }
}
