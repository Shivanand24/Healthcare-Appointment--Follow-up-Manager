import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { postVisitSchema } from "@/lib/validators";
import { generatePostVisitSummary } from "@/lib/llm";
import { enqueueJob } from "@/lib/queue";
import { AppointmentStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = postVisitSchema.parse(body);

    // Verify this appointment belongs to this doctor
    const doctor = await db.doctorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });
    }

    const appointment = await db.appointment.findFirst({
      where: {
        id: data.appointmentId,
        doctorId: doctor.id,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        patient: true,
        postVisitRecord: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found or not accessible" },
        { status: 404 }
      );
    }

    if (appointment.postVisitRecord) {
      return NextResponse.json(
        { error: "Post-visit record already exists" },
        { status: 409 }
      );
    }

    // ── Generate LLM post-visit summary ─────────────────────────────────────
    const summary = await generatePostVisitSummary(
      data.doctorNotes,
      data.prescriptions
    );

    const followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;

    // ── Atomic: create post-visit + mark appointment completed ───────────────
    const [, postVisitRecord] = await db.$transaction([
      db.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
      }),
      db.postVisitRecord.create({
        data: {
          appointmentId: appointment.id,
          doctorNotes: data.doctorNotes,
          plainSummary: summary.plain_summary,
          prescriptionDetails: summary.medication_schedule,
          followUpDate,
        },
      }),
    ]);

    // ── Enqueue medication reminder if prescriptions present ─────────────────
    if (data.prescriptions.length > 0) {
      await enqueueJob({
        type: "MEDICATION_REMINDER",
        appointmentId: appointment.id,
        payload: {
          patientEmail: appointment.patient.email,
          patientName: appointment.patient.name,
          medications: data.prescriptions,
        },
      });
    }

    return NextResponse.json({
      postVisitRecord,
      plainSummary: summary.plain_summary,
      isFallback: summary.fallback,
      message: "Consultation record saved successfully",
    });
  } catch (err) {
    console.error("Post-visit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
