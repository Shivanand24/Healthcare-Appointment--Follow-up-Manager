import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET all DOCTOR role users without a doctor profile (for onboarding)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "DOCTOR";

    const users = await db.user.findMany({
      where: {
        role: role as "PATIENT" | "DOCTOR" | "ADMIN",
        doctorProfile: role === "DOCTOR" ? { is: null } : undefined,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Users route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
