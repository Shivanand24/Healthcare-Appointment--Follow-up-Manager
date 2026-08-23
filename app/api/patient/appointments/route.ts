import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppointmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appointments = await db.appointment.findMany({
      where: { patientId: session.user.id },
      include: {
        doctor: {
          include: { user: { select: { name: true } } },
        },
        preVisitSummary: true,
        postVisitRecord: true,
      },
      orderBy: { appointmentDate: "desc" },
    });

    return NextResponse.json({ appointments });
  } catch (err) {
    console.error("Patient appointments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
