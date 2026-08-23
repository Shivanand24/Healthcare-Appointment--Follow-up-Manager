import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctorLeaveSchema } from "@/lib/validators";
import { enqueueJob } from "@/lib/queue";
import { AppointmentStatus } from "@prisma/client";
import { format, startOfDay, endOfDay } from "date-fns";

// GET: List all leaves
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leaves = await db.doctorLeave.findMany({
      include: {
        doctor: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { leaveDate: "desc" },
    });

    return NextResponse.json({ leaves });
  } catch (err) {
    console.error("Admin leaves GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create doctor leave + atomically cancel affected appointments
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = doctorLeaveSchema.parse(body);

    const leaveDate = new Date(data.leaveDate);
    const dayStart = startOfDay(leaveDate);
    const dayEnd = endOfDay(leaveDate);

    // ── Atomic: create leave + cancel all active appointments that day ────────
    const [leave, affectedAppointments] = await db.$transaction(async (tx) => {
      // Find all active appointments for this doctor on this date
      const affected = await tx.appointment.findMany({
        where: {
          doctorId: data.doctorId,
          appointmentDate: { gte: dayStart, lte: dayEnd },
          status: {
            in: [AppointmentStatus.HELD, AppointmentStatus.CONFIRMED],
          },
        },
        include: {
          patient: { select: { email: true, name: true } },
          doctor: { include: { user: { select: { name: true } } } },
        },
      });

      // Cancel all affected appointments
      await tx.appointment.updateMany({
        where: {
          doctorId: data.doctorId,
          appointmentDate: { gte: dayStart, lte: dayEnd },
          status: { in: [AppointmentStatus.HELD, AppointmentStatus.CONFIRMED] },
        },
        data: { status: AppointmentStatus.CANCELLED_BY_DOCTOR },
      });

      // Create leave record
      const newLeave = await tx.doctorLeave.create({
        data: {
          doctorId: data.doctorId,
          leaveDate: leaveDate,
          reason: data.reason,
          status: "APPROVED",
        },
      });

      return [newLeave, affected];
    });

    // ── Enqueue cancellation notifications for all affected patients ──────────
    const dateStr = format(leaveDate, "EEEE, MMMM d, yyyy");

    await Promise.all(
      affectedAppointments.map((apt) =>
        enqueueJob({
          type: "CANCELLATION",
          appointmentId: apt.id,
          payload: {
            patientEmail: apt.patient.email,
            patientName: apt.patient.name,
            doctorName: apt.doctor.user.name,
            date: dateStr,
            time: apt.startTime,
            reason: data.reason || "Doctor is on scheduled leave",
          },
        })
      )
    );

    return NextResponse.json({
      leave,
      cancelledCount: affectedAppointments.length,
      message: `Leave recorded. ${affectedAppointments.length} appointment(s) cancelled and patients notified.`,
    });
  } catch (err) {
    console.error("Admin leave POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
