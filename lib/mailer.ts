// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require("nodemailer") as typeof import("nodemailer");

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  // In dev without credentials, log instead
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`📧 [DEV EMAIL] To: ${payload.to}`);
    console.log(`   Subject: ${payload.subject}`);
    return;
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Healthcare App <noreply@healthcare.com>",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export function bookingConfirmationEmail(data: {
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  specialization: string;
}): EmailPayload {
  return {
    to: "", // set by caller
    subject: `✅ Appointment Confirmed — ${data.date} at ${data.time}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Appointment Confirmed</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p>Dear <strong>${data.patientName}</strong>,</p>
          <p>Your appointment has been successfully confirmed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #64748b;">Doctor</td>
              <td style="padding: 12px; font-weight: bold;">${data.doctorName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #64748b;">Specialization</td>
              <td style="padding: 12px;">${data.specialization}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #64748b;">Date</td>
              <td style="padding: 12px;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #64748b;">Time</td>
              <td style="padding: 12px;">${data.time}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please arrive 10 minutes early. Bring any relevant medical records.</p>
        </div>
      </div>
    `,
  };
}

export function cancellationEmail(data: {
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  reason?: string;
}): EmailPayload {
  return {
    to: "",
    subject: `❌ Appointment Cancelled — ${data.date} at ${data.time}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Appointment Cancelled</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p>Dear <strong>${data.patientName}</strong>,</p>
          <p>We regret to inform you that your appointment has been cancelled.</p>
          <p><strong>Doctor:</strong> ${data.doctorName}</p>
          <p><strong>Date:</strong> ${data.date} at ${data.time}</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
          <p>Please visit our portal to reschedule your appointment at your convenience.</p>
        </div>
      </div>
    `,
  };
}

export function medicationReminderEmail(data: {
  patientName: string;
  medications: Array<{ name: string; dosage: string; frequency: string }>;
}): EmailPayload {
  const medList = data.medications
    .map((m) => `<li><strong>${m.name}</strong> ${m.dosage} — ${m.frequency}</li>`)
    .join("");

  return {
    to: "",
    subject: "💊 Medication Reminder",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Medication Reminder</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p>Dear <strong>${data.patientName}</strong>,</p>
          <p>This is a friendly reminder about your prescribed medications:</p>
          <ul style="margin: 15px 0; padding-left: 20px;">${medList}</ul>
          <p style="color: #64748b; font-size: 14px;">Take your medications as prescribed. Contact your doctor if you experience any side effects.</p>
        </div>
      </div>
    `,
  };
}
