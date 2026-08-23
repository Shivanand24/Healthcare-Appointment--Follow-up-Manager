import { format, addMinutes, parseISO, startOfDay, endOfDay } from "date-fns";
import { db } from "@/lib/db";

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

/**
 * Generate all time slots for a doctor on a given date,
 * marking each as available or booked.
 */
export async function getDoctorSlots(
  doctorId: string,
  date: string // YYYY-MM-DD
): Promise<TimeSlot[]> {
  const doctor = await db.doctorProfile.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) return [];

  const targetDate = parseISO(date);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  // Check for leave
  const leave = await db.doctorLeave.findFirst({
    where: {
      doctorId,
      leaveDate: { gte: dayStart, lte: dayEnd },
      status: "APPROVED",
    },
  });

  if (leave) return []; // Doctor on leave, no slots available

  // Fetch booked slots
  const bookedAppointments = await db.appointment.findMany({
    where: {
      doctorId,
      appointmentDate: { gte: dayStart, lte: dayEnd },
      status: { in: ["HELD", "CONFIRMED"] },
    },
    select: { startTime: true },
  });

  const bookedTimes = new Set(bookedAppointments.map((a) => a.startTime));

  // Generate all possible slots
  const slots: TimeSlot[] = [];
  const [startHour, startMin] = doctor.workingHoursStart.split(":").map(Number);
  const [endHour, endMin] = doctor.workingHoursEnd.split(":").map(Number);

  const workStart = new Date(targetDate);
  workStart.setHours(startHour, startMin, 0, 0);

  const workEnd = new Date(targetDate);
  workEnd.setHours(endHour, endMin, 0, 0);

  let current = workStart;

  while (current < workEnd) {
    const slotEnd = addMinutes(current, doctor.slotDurationMinutes);
    if (slotEnd > workEnd) break;

    const startStr = format(current, "HH:mm");
    const endStr = format(slotEnd, "HH:mm");

    slots.push({
      startTime: startStr,
      endTime: endStr,
      available: !bookedTimes.has(startStr),
    });

    current = slotEnd;
  }

  return slots;
}

/**
 * Format appointment date for display
 */
export function formatAppointmentDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE, MMMM d, yyyy");
}

/**
 * Check if an appointment hold has expired
 */
export function isHoldExpired(holdExpiresAt: Date | null): boolean {
  if (!holdExpiresAt) return true;
  return new Date() > new Date(holdExpiresAt);
}
