import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctor = await db.doctorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const targetDate = new Date(dateParam);

    const appointments = await db.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        status: { in: ["CONFIRMED", "COMPLETED", "HELD"] },
      },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true },
        },
        preVisitSummary: true,
        postVisitRecord: true,
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ appointments, doctorId: doctor.id, date: dateParam });
  } catch (err) {
    console.error("Doctor schedule error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
