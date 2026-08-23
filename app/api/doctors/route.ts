import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorSearchSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = doctorSearchSchema.parse({
      specialization: searchParams.get("specialization") || undefined,
      date: searchParams.get("date") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    const skip = (query.page - 1) * query.limit;

    const where = query.specialization
      ? {
          specialization: {
            contains: query.specialization,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [doctors, total] = await Promise.all([
      db.doctorProfile.findMany({
        where,
        skip,
        take: query.limit,
        include: {
          user: {
            select: { name: true, email: true, phone: true },
          },
          _count: {
            select: { appointments: true },
          },
        },
        orderBy: { specialization: "asc" },
      }),
      db.doctorProfile.count({ where }),
    ]);

    return NextResponse.json({
      doctors,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (err) {
    console.error("Doctor search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
