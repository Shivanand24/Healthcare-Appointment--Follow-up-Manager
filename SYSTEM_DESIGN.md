# Healthcare Appointment Manager — System Design Write-up

## 1. Double-Booking Prevention & Slot Conflict Resolution
A major challenge in healthcare scheduling is preventing concurrent users from booking the exact same time slot with the same doctor. We solved this through a multi-layered atomic reservation system:
- **Temporary Slot Holds:** When a patient clicks a slot, the system creates an `Appointment` record with a `HELD` status and a 5-minute TTL (`holdExpiresAt`). 
- **Database-Level Unique Constraints:** We applied a composite `@@unique([doctorId, appointmentDate, startTime])` constraint in PostgreSQL. If two users click "Hold" simultaneously, the database strictly enforces uniqueness. Prisma catches the resulting `P2002` error, allowing us to gracefully return a "slot unavailable" message.
- **Stale Hold Cleanup:** Every new hold request triggers an automatic background cleanup of any `HELD` records whose TTL has expired, immediately returning them to the pool of available slots.

## 2. Doctor Leave Conflict Handling
When an admin marks a doctor as on leave (e.g., for sickness or a conference), existing appointments must be reliably cancelled and patients notified.
- **Atomic Bulk Updates:** The system uses Prisma's `$transaction` API. It first queries all `CONFIRMED` or `HELD` appointments for the specified date, bulk-updates their status to `CANCELLED_BY_DOCTOR`, and creates the `DoctorLeave` record. This guarantees that no leave is created without clearing the schedule, and no schedule is cleared if the leave creation fails.
- **Asynchronous Fan-out:** During the transaction, the IDs of the cancelled appointments are collected. The server then enqueues a `CANCELLATION` job for each affected patient, ensuring the UI remains fast while emails and calendar updates process in the background.

## 3. Notification Reliability & Failure Handling
Medical appointments demand high reliability for notifications (emails and calendar sync). Synchronous API calls block the main thread and can fail due to network timeouts.
- **Async Queue Engine (BullMQ):** We integrated BullMQ backed by Redis to handle all external side-effects (`BOOKING_CONFIRMATION`, `CANCELLATION`, `MEDICATION_REMINDER`, `CALENDAR_SYNC`).
- **In-Process Fallback:** For seamless local development without Redis, the queue gracefully falls back to `setImmediate()` processing.
- **Exponential Backoff & Audit Trails:** Every notification job creates a `NotificationAudit` database record. If a third-party API (like SendGrid or Google Calendar) fails, the worker catches the error, logs it to the audit table, and schedules a retry with exponential backoff (1m, 5m, 15m). If all retries fail, it marks the job as a `DEAD_LETTER` so an admin can manually investigate.

## 4. LLM Integration & Prompt Resilience
We integrated Google Gemini AI for two critical flows: Pre-Visit Symptom Triage (patient input to clinical summary) and Post-Visit Records (clinical notes to plain-English patient instructions).
- **Structured JSON Outputs:** Prompts are strictly engineered using few-shot examples and explicit formatting rules (e.g., `"Return ONLY valid JSON"`).
- **Graceful Degradation:** External LLM APIs can spike in latency. We wrapped all LLM calls in a `Promise.race` with a strict 5-second timeout. If the LLM times out or returns malformed JSON, the system catches the error, sets a `rawFallbackFlag: true`, and returns sensible defaults (e.g., setting urgency to `MEDIUM` and saving the exact raw text). The core booking flow never crashes.

## 5. Email & Google Calendar Integration
- **Email:** The system uses Nodemailer with responsive HTML templates to send branded booking confirmations, cancellation notices, and medication reminders.
- **Google Calendar (OAuth 2.0):** We integrated the `googleapis` library utilizing a central Service Account/Refresh Token pattern. Upon booking confirmation, a `CALENDAR_SYNC` job is dispatched. The system connects to the Google Calendar API and inserts an event. Instead of managing complex individual user OAuth scopes, the system creates the event centrally and adds the patient and doctor emails as *attendees*. This automatically pushes the event to both of their primary calendars and sends native Google Calendar invites. If an appointment is cancelled, a `CALENDAR_DELETE` job removes the event.

## 6. API Design & Code Structure
- **Next.js App Router:** The application leverages React Server Components for fast data fetching and Client Components for interactive UI (slot grids, dynamic forms).
- **Role-Based Access Control (RBAC):** We use NextAuth.js with JWTs storing the user's role (`PATIENT`, `DOCTOR`, `ADMIN`). A global Next.js Middleware (`middleware.ts`) protects all dashboard routes, instantly redirecting unauthorized users before the page even renders.
- **Zod Validation:** Every API route validates incoming JSON payloads using Zod schemas, instantly rejecting malformed data with 400 Bad Request errors to protect database integrity.
