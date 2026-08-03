import { getIntegrationConfig } from "../../integrations/service.js";

/**
 * Google Calendar availability + event creation.
 *
 * Uses the org's `google_calendar` integration (calendarId + apiToken as a
 * Bearer/OAuth access token). Everything is best-effort: if the integration
 * isn't connected or the API errors, functions degrade gracefully (freebusy
 * returns null = "unknown, don't block"; event creation is fire-and-forget) so
 * the platform keeps working on its own appointment data.
 */
async function config(organizationId: string) {
  const cfg = await getIntegrationConfig(organizationId, "google_calendar");
  if (!cfg?.calendarId || !cfg.apiToken) return null;
  return { calendarId: cfg.calendarId, token: cfg.apiToken };
}

/** Returns true if free, false if busy, or null if we couldn't determine it. */
export async function googleIsFree(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<boolean | null> {
  const cfg = await config(organizationId);
  if (!cfg) return null;
  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: cfg.calendarId }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    const busy = data.calendars?.[cfg.calendarId]?.busy ?? [];
    return busy.length === 0;
  } catch {
    return null;
  }
}

/** Create a calendar event for a booking. Fire-and-forget; never throws. */
export async function googleCreateEvent(
  organizationId: string,
  params: { summary: string; start: Date; durationMinutes: number; description?: string },
): Promise<void> {
  const cfg = await config(organizationId);
  if (!cfg) return;
  const end = new Date(params.start.getTime() + params.durationMinutes * 60000);
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.start.toISOString() },
          end: { dateTime: end.toISOString() },
        }),
      },
    );
  } catch {
    // best-effort — the appointment already lives in our DB
  }
}
