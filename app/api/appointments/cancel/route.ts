import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelAppointmentSchema } from "@/lib/validators";
import { enqueueJob } from "@/lib/queue";
import { AppointmentStatus } from "@prisma/client";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = cancelAppointmentSchema.parse(body);

    const appointment = await db.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Patients can only cancel their own appointments
    if (
      session.user.role === "PATIENT" &&
      appointment.patientId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cancellationStatus =
      session.user.role === "PATIENT"
        ? AppointmentStatus.CANCELLED_BY_PATIENT
        : AppointmentStatus.CANCELLED_BY_DOCTOR;

    await db.appointment.update({
      where: { id: appointment.id },
      data: { status: cancellationStatus },
    });

    const dateStr = format(appointment.appointmentDate, "EEEE, MMMM d, yyyy");

    await enqueueJob({
      type: "CANCELLATION",
      appointmentId: appointment.id,
      payload: {
        patientEmail: appointment.patient.email,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.user.name,
        date: dateStr,
        time: appointment.startTime,
        reason: data.reason,
      },
    });

    await enqueueJob({
      type: "CALENDAR_DELETE",
      appointmentId: appointment.id,
      payload: { appointmentId: appointment.id },
    });

    return NextResponse.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
    console.error("Cancel appointment error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
