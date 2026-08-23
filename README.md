# Healthcare Appointment & Follow-up Manager

A **production-ready, full-stack healthcare appointment scheduling platform** built with Next.js 15, Prisma ORM, NextAuth.js, Google Gemini AI, Redis/BullMQ async queues, and Tailwind CSS.

---

## 🚀 Features

| Feature | Implementation |
|---|---|
| **Role-Based Access** | `PATIENT`, `DOCTOR`, `ADMIN` — JWT sessions via NextAuth.js |
| **Double-Booking Prevention** | Atomic 5-min slot holds + unique DB constraint |
| **AI Symptom Triage** | Gemini API → `urgency_level`, `chief_complaint`, `suggested_questions` |
| **Post-Visit Summaries** | AI converts clinical notes → patient-friendly plain language |
| **Async Notifications** | BullMQ + Redis (in-process fallback for dev) |
| **Retry Pipeline** | Exponential backoff: 1m → 5m → 15m → Dead Letter Queue |
| **Doctor Leave Engine** | Atomic leave + bulk appointment cancellation + email notifications |
| **Google Calendar Sync** | Placeholder integration ready for OAuth token injection |
| **Medication Reminders** | Queue jobs dispatched on prescription creation |

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/     ← NextAuth handler
│   │   ├── auth/register/          ← User registration
│   │   ├── appointments/hold/      ← Atomic slot hold
│   │   ├── appointments/confirm/   ← Confirm + AI triage
│   │   ├── appointments/cancel/    ← Cancel + notification
│   │   ├── doctors/                ← Doctor search
│   │   ├── doctors/[id]/slots/     ← Available slot grid
│   │   ├── patient/appointments/   ← Patient appointment list
│   │   ├── doctor/schedule/        ← Doctor daily schedule
│   │   ├── doctor/consultations/   ← Post-visit record + AI summary
│   │   ├── admin/doctors/          ← Doctor management
│   │   ├── admin/leaves/           ← Leave management
│   │   └── admin/audit/            ← Notification audit logs
│   ├── patient/dashboard/          ← Patient portal
│   ├── doctor/dashboard/           ← Doctor portal
│   ├── admin/dashboard/            ← Admin portal
│   ├── login/                      ← Auth with demo buttons
│   ├── register/                   ← Registration
│   ├── layout.tsx                  ← Root layout
│   └── page.tsx                    ← Landing page
├── components/
│   └── providers.tsx               ← NextAuth SessionProvider
├── lib/
│   ├── auth.ts                     ← NextAuth config
│   ├── db.ts                       ← Prisma singleton
│   ├── llm.ts                      ← Gemini AI integration
│   ├── mailer.ts                   ← Nodemailer email templates
│   ├── queue.ts                    ← BullMQ/in-process job queue
│   ├── slots.ts                    ← Slot generation logic
│   └── validators.ts               ← Zod schemas
├── prisma/
│   ├── schema.prisma               ← Complete database schema
│   └── seed.ts                     ← Demo data seed script
├── middleware.ts                   ← Route protection + RBAC
└── .env.example                    ← Environment variables template
```

---

## ⚡ Local Setup

### 1. Clone & Install

```bash
# Navigate to project folder
cd "Healthcare Appointment & Follow-up Manager"

# Install dependencies
npm install
```

### 2. Environment Variables

```bash
# Copy template
copy .env.example .env.local
```

Edit `.env.local` and fill in your values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/healthcare_db?sslmode=require"
NEXTAUTH_SECRET="your-super-secret-32-char-key"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

> **Tip:** For zero-config local testing, only `DATABASE_URL` and `NEXTAUTH_SECRET` are strictly required. AI triage will gracefully fallback, and emails will log to console.

### 3. Database Setup

```bash
# Push schema to database (development)
npx prisma db push

# OR run migrations (production)
npx prisma migrate dev --name init

# Seed with demo data
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Demo Login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@healthcare.com` | `admin123` |
| Doctor | `dr.smith@healthcare.com` | `doctor123` |
| Patient | `john.doe@example.com` | `patient123` |

Click the **Quick Demo Login** buttons on the login page for instant access.

---

## 🗄️ Database Schema

### Entities

| Entity | Description |
|---|---|
| `User` | Base user with role (`PATIENT`/`DOCTOR`/`ADMIN`), email, bcrypt password |
| `DoctorProfile` | Specialization, working hours, slot duration, daily capacity, fee |
| `DoctorLeave` | Leave dates per doctor with approval status |
| `Appointment` | Booking record with 5-min hold expiry and status tracking |
| `PreVisitSummary` | AI triage: urgency level, chief complaint, suggested questions |
| `PostVisitRecord` | Clinical notes, AI plain summary, prescription JSON, follow-up date |
| `NotificationAudit` | Email/calendar job tracking with retry count and error logs |

### Key Constraints

```sql
-- Prevents double-booking at database level
UNIQUE (doctorId, appointmentDate, startTime)
-- for active (HELD or CONFIRMED) appointments
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/[...nextauth]` | NextAuth login/logout |

### Appointments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/appointments/hold` | PATIENT | Create 5-min slot hold |
| `POST` | `/api/appointments/confirm` | PATIENT | Confirm + AI triage |
| `POST` | `/api/appointments/cancel` | PATIENT/DOCTOR | Cancel appointment |

### Doctors
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/doctors?specialization=X` | Public | Search doctors |
| `GET` | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Public | Available slots |

### Patient
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/patient/appointments` | PATIENT | My appointments list |

### Doctor
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/doctor/schedule?date=YYYY-MM-DD` | DOCTOR | Daily schedule |
| `POST` | `/api/doctor/consultations` | DOCTOR | Post-visit record + AI summary |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/admin/doctors` | ADMIN | List / create doctors |
| `GET/POST` | `/api/admin/leaves` | ADMIN | List / create doctor leaves |
| `GET` | `/api/admin/audit` | ADMIN | Notification audit logs |

---

## 🤖 AI Prompt Engineering

### Pre-Visit Triage Prompt
```
You are a medical triage assistant. Analyze patient symptoms.
Return ONLY valid JSON:
{
  "urgency_level": "LOW" | "MEDIUM" | "HIGH",
  "chief_complaint": "concise clinical description",
  "suggested_questions": ["q1", "q2", "q3"]
}
Urgency Rules:
- HIGH: chest pain, stroke symptoms, severe bleeding, breathing difficulty
- MEDIUM: persistent pain, fever >38.5°C, moderate functional impairment
- LOW: mild symptoms, minor discomfort, routine check-ups
```

### Post-Visit Summary Prompt
```
Convert clinical notes into warm, patient-friendly plain English.
Return ONLY valid JSON:
{
  "plain_summary": "2-3 sentence explanation",
  "medication_schedule": [...],
  "follow_up_instructions": "clear care instructions"
}
Avoid medical jargon. Be reassuring but accurate.
```

### Graceful Fallback
If Gemini API fails or times out (5s), `rawFallbackFlag = true` is saved and sensible defaults are returned — the booking flow **never crashes**.

---

## 🔄 System Design

### Double-Booking Prevention

1. **Expired hold cleanup**: On every hold request, expired HELD appointments are batch-released.
2. **Concurrent check + insert**: `findFirst` check followed by `create` with a unique constraint on `(doctorId, appointmentDate, startTime)`.
3. **Prisma P2002 race condition catch**: If two concurrent requests pass the check simultaneously, PostgreSQL's unique index raises `P2002` — caught and returned as a 409.
4. **5-minute TTL**: `holdExpiresAt` timestamp. Patient frontend shows a live countdown timer.

### Doctor Leave Conflict Resolution

1. Admin submits leave for a doctor+date.
2. A **single Prisma transaction** (`db.$transaction`):
   - Queries all `HELD` or `CONFIRMED` appointments for that doctor on that date.
   - Updates all to `CANCELLED_BY_DOCTOR`.
   - Creates the leave record.
3. For each cancelled appointment, a `CANCELLATION` job is enqueued asynchronously.
4. Result includes exact count of cancelled appointments.

### Notification Reliability

```
HTTP Request → API Handler → enqueueJob()
                                  ↓
                         REDIS_URL set?
                        /              \
               BullMQ Queue         setImmediate()
               (Production)         (Dev fallback)
                   ↓
           Worker processes job
                   ↓
          Success → DB status: SENT
          Failure → Retry after 1m, 5m, 15m
          Max retries → Dead Letter Queue
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add all environment variables
4. Deploy → Vercel auto-runs `npm run build`

```bash
# Production database migration
npx prisma migrate deploy

# Seed (run once)
npx prisma db seed
```

### Environment for Production

```env
DATABASE_URL=postgresql://...   ← Neon / Supabase / Railway
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GEMINI_API_KEY=...
REDIS_URL=redis://...           ← Upstash (optional, in-process fallback works)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```

---

## 📋 Deliverables Checklist

- [x] Complete source code with modular folder structure
- [x] `schema.prisma` with all 7 entities + relations + constraints
- [x] `prisma/seed.ts` with admin, 3 doctors, 2 patients, sample appointments
- [x] All API routes with Zod input validation
- [x] Gemini AI integration with 5s timeout + graceful fallback
- [x] BullMQ/Redis async queue with exponential backoff retry
- [x] Atomic double-booking prevention (DB unique constraint + P2002 handler)
- [x] Doctor leave management with atomic bulk cancellation
- [x] Patient portal (search, slot grid, symptom form, appointments, prescriptions)
- [x] Doctor portal (daily schedule, AI urgency badges, consultation form)
- [x] Admin portal (onboarding wizard, leave manager, audit logs)
- [x] NextAuth.js RBAC middleware protecting all portal routes
- [x] `.env.example` with all required variable descriptions
- [x] Comprehensive `README.md` with setup, API docs, system design

---

*Built with Next.js 15 · Prisma ORM · NextAuth.js · Google Gemini AI · BullMQ · Tailwind CSS*
