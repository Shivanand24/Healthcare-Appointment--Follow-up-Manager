import { NextRequest, NextResponse } from "next/server";
import { getDoctorSlots } from "@/lib/slots";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date query param required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Prevent booking in the past
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return NextResponse.json(
        { error: "Cannot book appointments in the past" },
        { status: 400 }
      );
    }

    const slots = await getDoctorSlots(doctorId, date);

    return NextResponse.json({ date, doctorId, slots });
  } catch (err) {
    console.error("Slots error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
