import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).default("PATIENT"),
});

// ─── Appointments ─────────────────────────────────────────────────────────────

export const holdSlotSchema = z.object({
  doctorId: z.string().cuid("Invalid doctor ID"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
});

export const confirmAppointmentSchema = z.object({
  appointmentId: z.string().cuid("Invalid appointment ID"),
  symptoms: z.string().min(10, "Please describe your symptoms (min 10 characters)").max(2000),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().cuid("Invalid appointment ID"),
  reason: z.string().optional(),
});

// ─── Doctor Leave ─────────────────────────────────────────────────────────────

export const doctorLeaveSchema = z.object({
  doctorId: z.string().cuid("Invalid doctor ID"),
  leaveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  reason: z.string().optional(),
});

// ─── Doctor Profile ───────────────────────────────────────────────────────────

export const doctorProfileSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
  specialization: z.string().min(2, "Specialization required"),
  slotDurationMinutes: z.number().int().min(10).max(120).default(30),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  dailyCapacity: z.number().int().min(1).max(50).default(16),
  bio: z.string().max(500).optional(),
  consultationFee: z.number().positive().optional(),
});

// ─── Consultation (Post-Visit) ────────────────────────────────────────────────

export const postVisitSchema = z.object({
  appointmentId: z.string().cuid("Invalid appointment ID"),
  doctorNotes: z.string().min(10, "Notes must be at least 10 characters"),
  prescriptions: z
    .array(
      z.object({
        name: z.string().min(1, "Medication name required"),
        dosage: z.string().min(1, "Dosage required"),
        frequency: z.string().min(1, "Frequency required"),
        duration: z.string().min(1, "Duration required"),
        instructions: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  followUpDate: z.string().optional(),
});

// ─── Doctor Search ────────────────────────────────────────────────────────────

export const doctorSearchSchema = z.object({
  specialization: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
