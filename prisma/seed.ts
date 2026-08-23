import { PrismaClient, Role, AppointmentStatus, UrgencyLevel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ──────────── Clean up (order matters for FK constraints) ────────────
  await prisma.notificationAudit.deleteMany();
  await prisma.postVisitRecord.deleteMany();
  await prisma.preVisitSummary.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  // ──────────── Admin ────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@healthcare.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      name: "System Admin",
      phone: "+1-000-000-0000",
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ──────────── Doctors ────────────
  const doctorPassword = await bcrypt.hash("doctor123", 12);

  const doctorUser1 = await prisma.user.create({
    data: {
      email: "dr.smith@healthcare.com",
      passwordHash: doctorPassword,
      role: Role.DOCTOR,
      name: "Dr. Sarah Smith",
      phone: "+1-555-100-0001",
    },
  });
  const doctor1 = await prisma.doctorProfile.create({
    data: {
      userId: doctorUser1.id,
      specialization: "Cardiology",
      slotDurationMinutes: 30,
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      dailyCapacity: 16,
      bio: "Board-certified cardiologist with 15+ years of experience.",
      consultationFee: 150,
    },
  });

  const doctorUser2 = await prisma.user.create({
    data: {
      email: "dr.jones@healthcare.com",
      passwordHash: doctorPassword,
      role: Role.DOCTOR,
      name: "Dr. Michael Jones",
      phone: "+1-555-100-0002",
    },
  });
  const doctor2 = await prisma.doctorProfile.create({
    data: {
      userId: doctorUser2.id,
      specialization: "Neurology",
      slotDurationMinutes: 45,
      workingHoursStart: "10:00",
      workingHoursEnd: "18:00",
      dailyCapacity: 10,
      bio: "Specialist in neurological disorders and brain health.",
      consultationFee: 200,
    },
  });

  const doctorUser3 = await prisma.user.create({
    data: {
      email: "dr.patel@healthcare.com",
      passwordHash: doctorPassword,
      role: Role.DOCTOR,
      name: "Dr. Priya Patel",
      phone: "+1-555-100-0003",
    },
  });
  await prisma.doctorProfile.create({
    data: {
      userId: doctorUser3.id,
      specialization: "General Medicine",
      slotDurationMinutes: 20,
      workingHoursStart: "08:00",
      workingHoursEnd: "16:00",
      dailyCapacity: 24,
      bio: "Family physician focused on preventive care and wellness.",
      consultationFee: 80,
    },
  });

  console.log("✅ 3 Doctors created");

  // ──────────── Patients ────────────
  const patientPassword = await bcrypt.hash("patient123", 12);

  const patient1 = await prisma.user.create({
    data: {
      email: "john.doe@example.com",
      passwordHash: patientPassword,
      role: Role.PATIENT,
      name: "John Doe",
      phone: "+1-555-200-0001",
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      email: "jane.doe@example.com",
      passwordHash: patientPassword,
      role: Role.PATIENT,
      name: "Jane Doe",
      phone: "+1-555-200-0002",
    },
  });

  console.log("✅ 2 Patients created");

  // ──────────── Appointments ────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  const apt1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      appointmentDate: tomorrow,
      startTime: "10:00",
      endTime: "10:30",
      status: AppointmentStatus.CONFIRMED,
    },
  });

  await prisma.preVisitSummary.create({
    data: {
      appointmentId: apt1.id,
      rawSymptoms: "Chest pain for 2 days, mild shortness of breath when climbing stairs.",
      urgencyLevel: UrgencyLevel.HIGH,
      chiefComplaint: "Chest pain with exertional dyspnea",
      suggestedQuestions: [
        "Is the chest pain sharp or pressure-like?",
        "Does it radiate to your arm or jaw?",
        "Any family history of heart disease?",
      ],
      rawFallbackFlag: false,
    },
  });

  const apt2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: doctor2.id,
      appointmentDate: nextWeek,
      startTime: "14:00",
      endTime: "14:45",
      status: AppointmentStatus.CONFIRMED,
    },
  });

  await prisma.preVisitSummary.create({
    data: {
      appointmentId: apt2.id,
      rawSymptoms: "Recurring headaches, especially in the morning. Sensitivity to light.",
      urgencyLevel: UrgencyLevel.MEDIUM,
      chiefComplaint: "Recurrent morning headaches with photophobia",
      suggestedQuestions: [
        "How long have you been experiencing these headaches?",
        "Are they accompanied by nausea or vomiting?",
        "Any recent changes in vision?",
      ],
      rawFallbackFlag: false,
    },
  });

  // Completed appointment with post-visit record
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  pastDate.setHours(0, 0, 0, 0);

  const apt3 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor2.id,
      appointmentDate: pastDate,
      startTime: "11:00",
      endTime: "11:45",
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.postVisitRecord.create({
    data: {
      appointmentId: apt3.id,
      doctorNotes: "Patient presented with tension-type headaches. No focal neurological deficits. BP normal. Advised lifestyle modifications.",
      plainSummary:
        "Your headaches are likely due to stress and muscle tension — nothing dangerous was found during your exam. Take the prescribed pain reliever as needed and try to get 7–8 hours of sleep. Reduce screen time and stay hydrated. Come back if headaches worsen or become more frequent.",
      prescriptionDetails: [
        {
          name: "Ibuprofen 400mg",
          dosage: "400mg",
          frequency: "As needed (max 3 times/day)",
          duration: "7 days",
          instructions: "Take with food",
        },
        {
          name: "Magnesium Glycinate",
          dosage: "400mg",
          frequency: "Once daily at bedtime",
          duration: "30 days",
          instructions: "For headache prevention",
        },
      ],
      followUpDate: nextWeek,
    },
  });

  console.log("✅ Sample appointments + pre/post visit records created");

  // ──────────── Doctor Leave ────────────
  const leaveDate = new Date();
  leaveDate.setDate(leaveDate.getDate() + 3);
  leaveDate.setHours(0, 0, 0, 0);

  await prisma.doctorLeave.create({
    data: {
      doctorId: doctor1.id,
      leaveDate: leaveDate,
      reason: "Medical conference attendance",
      status: "APPROVED",
    },
  });

  console.log("✅ Doctor leave record created");
  console.log("\n🎉 Seeding complete!\n");
  console.log("Demo credentials:");
  console.log("  Admin  → admin@healthcare.com / admin123");
  console.log("  Doctor → dr.smith@healthcare.com / doctor123");
  console.log("  Patient → john.doe@example.com / patient123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
