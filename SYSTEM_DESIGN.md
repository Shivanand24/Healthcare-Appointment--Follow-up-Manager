# System Design Write-Up: Healthcare Appointment Manager

This document outlines the architectural decisions and system design patterns implemented to handle critical edge cases.

## 1. Double-Booking Prevention

### The Problem
In a high-traffic healthcare application, multiple patients may attempt to book the exact same time slot with the same doctor simultaneously. If not handled correctly, this leads to double-booking.

### The Solution: Database-Level Constraints & Transactional Isolation
To completely prevent double-booking, the system relies on database-level unique constraints and transactional isolation.
1. **Composite Unique Constraints**: The Appointment table in our PostgreSQL database has a unique constraint on (doctorId, startTime, status).
2. **Optimistic Concurrency Control**: When two users attempt to book the same slot, the application uses Prisma transaction API. If User A commits first, the database locks that row. When User B attempts to write, the database engine throws a unique key violation error.
3. **Application Handling**: The backend catches this specific Prisma error (P2002) and gracefully returns a HTTP 409 Conflict status to User B.

## 2. Doctor Leave Conflict Handling

### The Problem
Doctors frequently take planned or emergency leaves. If an appointment is already booked during a newly scheduled leave period, the system must automatically handle the conflict and notify the affected patients.

### The Solution: Asynchronous Conflict Resolution Workflow
1. **Leave Creation Check**: When an Admin creates a new leave record for a doctor, the system validates the dates.
2. **Conflict Query**: The database queries all SCHEDULED appointments for that specific doctor that overlap with the new leave period.
3. **Automated Cancellation**: The system wraps the state changes in a transaction. It changes the status of the overlapping appointments from SCHEDULED to CANCELLED.
4. **Patient Notification**: Using our BullMQ background job queue, a high-priority appointment-cancelled job is dispatched for each affected patient. The worker processes these jobs and sends automated emails.

## 3. Slot Hold Mechanism

### The Problem
When a patient selects a time slot and begins filling out the booking form, that slot remains available to other users until the form is submitted. This causes frustration if the slot is taken by someone else while the patient is typing.

### The Solution: Ephemeral Distributed Locks (Redis)
1. **Acquiring a Lock**: As soon as a patient clicks on a time slot, the backend sets a key in Redis formatted as hold:doctor_id:slot_timestamp with a Time-To-Live (TTL) of 5 minutes.
2. **Slot Filtering**: When other patients view the doctor calendar, the system checks both the PostgreSQL database (for permanent bookings) and Redis (for temporary holds). Any slot currently held in Redis is masked as unavailable.
3. **Lock Expiration or Consumption**: If the patient completes the booking within 5 minutes, the appointment is saved to PostgreSQL, and the Redis key is explicitly deleted. If they take too long, the Redis TTL automatically expires.

## 4. Notification Failure Handling

### The Problem
Email delivery is inherently unreliable. Network timeouts, rate limits, and temporary outages can cause critical notifications to drop.

### The Solution: Resilient Background Queues & Dead-Letter Exchanges
1. **Queueing Strategy**: All emails are offloaded to an email-queue immediately. The HTTP response is returned to the user instantly.
2. **Automatic Retries**: The BullMQ worker is configured with an exponential backoff strategy. If the SMTP server rejects the connection, the job is marked as failed and automatically retried.
3. **Idempotency**: Notification jobs carry unique idempotency keys to ensure users do not receive duplicate emails.
4. **Dead-Letter Queue (DLQ)**: If a job fails all 5 retry attempts, it is moved to a Dead-Letter Queue. Administrators can monitor the DLQ via a dashboard to manually inspect why the email failed.