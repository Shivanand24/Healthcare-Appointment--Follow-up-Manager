import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { confirmAppointmentSchema } from "@/lib/validators";
import { generatePreVisitTriage } from "@/lib/llm";
import { enqueueJob } from "@/lib/queue";
import { AppointmentStatus } from "@prisma/client";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = confirmAppointmentSchema.parse(body);

    // ── Fetch & validate appointment ─────────────────────────────────────────
    const appointment = await db.appointment.findFirst({
      where: {
        id: data.appointmentId,
        patientId: session.user.id,
        status: AppointmentStatus.HELD,
      },
      include: {
        doctor: {
          include: { user: true },
        },
        patient: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found or hold has expired" },
        { status: 404 }
      );
    }

    // Check hold expiry
    if (appointment.holdExpiresAt && new Date() > appointment.holdExpiresAt) {
      await db.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.CANCELLED_BY_PATIENT },
      });
      return NextResponse.json(
        { error: "Your hold has expired. Please select a new slot." },
        { status: 410 }
      );
    }

    // ── Run LLM triage (async, non-blocking for UX but awaited for data) ────
    const triage = await generatePreVisitTriage(data.symptoms);

    // ── Atomic transaction: confirm + save triage ─────────────────────────────
    const [confirmedAppointment] = await db.$transaction([
      db.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.CONFIRMED, holdExpiresAt: null },
      }),
      db.preVisitSummary.create({
        data: {
          appointmentId: appointment.id,
          rawSymptoms: data.symptoms,
          urgencyLevel: triage.urgency_level,
          chiefComplaint: triage.chief_complaint,
          suggestedQuestions: triage.suggested_questions,
          rawFallbackFlag: triage.fallback,
        },
      }),
    ]);

    // ── Enqueue notification jobs (non-blocking) ──────────────────────────────
    const dateStr = format(appointment.appointmentDate, "EEEE, MMMM d, yyyy");

    await enqueueJob({
      type: "BOOKING_CONFIRMATION",
      appointmentId: appointment.id,
      payload: {
        patientEmail: appointment.patient.email,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.user.name,
        specialization: appointment.doctor.specialization,
        date: dateStr,
        time: appointment.startTime,
      },
    });

    await enqueueJob({
      type: "CALENDAR_SYNC",
      appointmentId: appointment.id,
      payload: {
        appointmentId: appointment.id,
        patientEmail: appointment.patient.email,
        doctorName: appointment.doctor.user.name,
        date: dateStr,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      },
    });

    return NextResponse.json({
      appointment: confirmedAppointment,
      triage: {
        urgencyLevel: triage.urgency_level,
        chiefComplaint: triage.chief_complaint,
        suggestedQuestions: triage.suggested_questions,
        isFallback: triage.fallback,
      },
      message: "Appointment confirmed successfully!",
    });
  } catch (err: unknown) {
    console.error("Confirm appointment error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
