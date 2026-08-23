import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctorProfileSchema } from "@/lib/validators";

// GET: All doctors
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctors = await db.doctorProfile.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true, createdAt: true } },
        _count: { select: { appointments: true, leaves: true } },
      },
      orderBy: { specialization: "asc" },
    });

    return NextResponse.json({ doctors });
  } catch (err) {
    console.error("Admin doctors GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create doctor profile
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = doctorProfileSchema.parse(body);

    // Verify user exists and has DOCTOR role
    const user = await db.user.findUnique({ where: { id: data.userId } });
    if (!user || user.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "User not found or is not a DOCTOR" },
        { status: 400 }
      );
    }

    const profile = await db.doctorProfile.create({
      data: {
        userId: data.userId,
        specialization: data.specialization,
        slotDurationMinutes: data.slotDurationMinutes,
        workingHoursStart: data.workingHoursStart,
        workingHoursEnd: data.workingHoursEnd,
        dailyCapacity: data.dailyCapacity,
        bio: data.bio,
        consultationFee: data.consultationFee,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Doctor profile already exists for this user" },
        { status: 409 }
      );
    }
    console.error("Admin doctors POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
