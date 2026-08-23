import { google, calendar_v3 } from "googleapis";

// const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

/**
 * Initializes and returns an authenticated Google Calendar API client.
 * Returns null if credentials are not configured.
 */
function getCalendarClient(): calendar_v3.Calendar | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "http://localhost:3000" // Not strictly needed for server-to-server with refresh token
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

interface CalendarSyncPayload {
  appointmentId: string;
  patientEmail: string;
  doctorEmail: string;
  doctorName: string;
  patientName: string;
  specialization: string;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Creates or updates an event on the central service calendar, adding the patient
 * and doctor as attendees so it appears on their respective calendars.
 */
export async function syncCalendarEvent(payload: CalendarSyncPayload): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) {
    console.warn("⚠️ Google Calendar credentials missing. Skipping calendar sync.");
    return null;
  }

  // Parse dates into proper RFC3339 format for Google Calendar
  const startDateTime = new Date(`${payload.date}T${payload.startTime}:00Z`).toISOString();
  const endDateTime = new Date(`${payload.date}T${payload.endTime}:00Z`).toISOString();

  const event: calendar_v3.Schema$Event = {
    summary: `Medical Consultation: ${payload.patientName} & Dr. ${payload.doctorName}`,
    description: `Appointment with Dr. ${payload.doctorName} (${payload.specialization}).\n\nPlease do not reply to this automated calendar event.`,
    start: {
      dateTime: startDateTime,
      timeZone: "UTC", // All DB times are handled as UTC
    },
    end: {
      dateTime: endDateTime,
      timeZone: "UTC",
    },
    attendees: [
      { email: payload.patientEmail, displayName: payload.patientName },
      { email: payload.doctorEmail, displayName: `Dr. ${payload.doctorName}` },
    ],
    // The eventId must be unique. We can use the UUID without dashes
    id: payload.appointmentId.replace(/-/g, ""),
  };

  try {
    // Attempt to create the event
    const response = await calendar.events.insert({
      calendarId: "primary", // Uses the authenticated account's primary calendar
      sendUpdates: "all", // Sends email notifications to attendees from Google
      requestBody: event,
    });
    
    return response.data.id || null;
  } catch (error: any) {
    // If the event already exists (e.g. from a retry), update it instead
    if (error.code === 409) {
      console.log(`Event ${event.id} already exists. Updating instead.`);
      const response = await calendar.events.update({
        calendarId: "primary",
        eventId: event.id!,
        sendUpdates: "all",
        requestBody: event,
      });
      return response.data.id || null;
    }
    console.error("Google Calendar API Error:", error.message);
    throw error;
  }
}

/**
 * Cancels (deletes) an event from the calendar and notifies attendees.
 */
export async function deleteCalendarEvent(appointmentId: string): Promise<void> {
  const calendar = getCalendarClient();
  if (!calendar) {
    console.warn("⚠️ Google Calendar credentials missing. Skipping calendar delete.");
    return;
  }

  const eventId = appointmentId.replace(/-/g, "");

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });
  } catch (error: any) {
    // Ignore 404s if the event was already deleted
    if (error.code !== 404) {
      console.error("Google Calendar API Delete Error:", error.message);
      throw error;
    }
  }
}
