import { getServerSession } from "next-auth/next";
import { google } from "googleapis";
import { authOptions } from "./../../auth/[...nextauth]/route";

type CalendarEventInput = {
  summary?: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  tripId?: string;
  dayNumber?: number;
  routeUrl?: string;
};

function getConfiguredGroupParticipants() {
  return (process.env.GROUP_PLAN_USERS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildEndDate(endDate: string) {
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

function buildTripKey(evt: CalendarEventInput) {
  return [evt.tripId || evt.summary || "TripPilot Event", evt.dayNumber || 0].join("::");
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    if (!accessToken) {
      return Response.json({ error: "Not authenticated. Please sign out and sign back in to grant Calendar write permissions." }, { status: 401 });
    }

    const { events, groupPlanEnabled } = await req.json();

    if (!events || events.length === 0) {
      return Response.json({ error: "No events provided" }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString();

    const existingEvents = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      maxResults: 250,
      privateExtendedProperty: "source=trippilot",
    });

    const existingByKey = new Map<string, string>();
    for (const item of existingEvents.data.items || []) {
      const tripKey = item.extendedProperties?.private?.tripKey;
      if (tripKey && item.id) {
        existingByKey.set(tripKey, item.id);
      }
    }

    const attendeeList = (groupPlanEnabled ? getConfiguredGroupParticipants() : [])
      .filter((value: string) => value.includes("@"))
      .map((email: string) => ({ email }));

    const results = [];
    for (const evt of events as CalendarEventInput[]) {
      if (!evt.startDate) continue;

      const isAllDay = !evt.startDate.includes("T");
      const tripKey = buildTripKey(evt);
      const eventBody: any = {
        summary: evt.summary || "TripPilot Event",
        description: evt.description || "",
        location: evt.location || "",
        attendees: attendeeList,
        extendedProperties: {
          private: {
            source: "trippilot",
            tripKey,
            tripId: evt.tripId || evt.summary || "TripPilot Event",
            dayNumber: String(evt.dayNumber || 0),
            routeUrl: evt.routeUrl || "",
          },
        },
      };

      if (isAllDay) {
        eventBody.start = { date: evt.startDate };
        eventBody.end = { date: buildEndDate(evt.endDate || evt.startDate) };
      } else {
        eventBody.start = { dateTime: evt.startDate, timeZone: "America/Phoenix" };
        eventBody.end = { dateTime: evt.endDate || evt.startDate, timeZone: "America/Phoenix" };
      }

      const existingId = existingByKey.get(tripKey);
      const response = existingId
        ? await calendar.events.patch({
            calendarId: "primary",
            eventId: existingId,
            sendUpdates: attendeeList.length > 0 ? "all" : "none",
            requestBody: eventBody,
          })
        : await calendar.events.insert({
            calendarId: "primary",
            sendUpdates: attendeeList.length > 0 ? "all" : "none",
            requestBody: eventBody,
          });

      results.push({
        id: response.data.id,
        summary: response.data.summary,
        htmlLink: response.data.htmlLink,
        updated: Boolean(existingId),
      });
    }

    const updatedCount = results.filter((item) => item.updated).length;
    const createdCount = results.length - updatedCount;

    return Response.json({
      success: true,
      message: `${createdCount} event(s) created and ${updatedCount} event(s) updated in Google Calendar.`,
      events: results,
    });
  } catch (error: any) {
    console.error("[Calendar Add] ERROR:", error?.response?.data || error.message);

    const googleError = error?.response?.data?.error;
    let userMessage = "Failed to update events: " + error.message;

    if (googleError?.code === 403) {
      userMessage = "Calendar access was denied. Sign out, sign back in, and accept calendar permissions.";
    } else if (googleError?.code === 401) {
      userMessage = "Your session expired. Sign out and sign back in.";
    }

    return Response.json({ error: userMessage }, { status: 500 });
  }
}
