import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { holdSlotSchema } from "@/lib/validators";
import { AppointmentStatus } from "@prisma/client";

const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = holdSlotSchema.parse(body);

    const appointmentDate = new Date(data.appointmentDate);
    appointmentDate.setHours(0, 0, 0, 0);

    // ── Check for doctor leave ───────────────────────────────────────────────
    const leaveExists = await db.doctorLeave.findFirst({
      where: {
        doctorId: data.doctorId,
        leaveDate: {
          gte: appointmentDate,
          lte: new Date(appointmentDate.getTime() + 86400000 - 1),
        },
        status: "APPROVED",
      },
    });

    if (leaveExists) {
      return NextResponse.json(
        { error: "Doctor is on leave on this date" },
        { status: 409 }
      );
    }

    // ── Release expired holds first ──────────────────────────────────────────
    await db.appointment.updateMany({
      where: {
        status: AppointmentStatus.HELD,
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: AppointmentStatus.CANCELLED_BY_PATIENT },
    });

    // ── Atomic slot hold (unique constraint prevents race conditions) ─────────
    const existing = await db.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        appointmentDate,
        startTime: data.startTime,
        status: { in: [AppointmentStatus.HELD, AppointmentStatus.CONFIRMED] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This slot is already taken. Please choose another." },
        { status: 409 }
      );
    }

    const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS);

    const appointment = await db.appointment.create({
      data: {
        patientId: session.user.id,
        doctorId: data.doctorId,
        appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        status: AppointmentStatus.HELD,
        holdExpiresAt,
      },
    });

    return NextResponse.json(
      {
        appointment,
        holdExpiresAt,
        message: "Slot held for 5 minutes. Please complete your booking.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "This slot was just taken. Please choose another." },
        { status: 409 }
      );
    }
    console.error("Hold slot error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
