import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const skip = (page - 1) * limit;

    const [audits, total] = await Promise.all([
      db.notificationAudit.findMany({
        skip,
        take: limit,
        include: {
          appointment: {
            include: {
              patient: { select: { name: true, email: true } },
              doctor: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.notificationAudit.count(),
    ]);

    return NextResponse.json({ audits, pagination: { page, limit, total } });
  } catch (err) {
    console.error("Admin audit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
