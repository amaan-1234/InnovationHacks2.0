import { getServerSession } from "next-auth/next";
import { google } from "googleapis";
import { authOptions } from "./../auth/[...nextauth]/route";

function getConfiguredGroupParticipants() {
  return (process.env.GROUP_PLAN_USERS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;
    const userEmail = session?.user?.email;

    if (!accessToken || !userEmail) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { subject, htmlBody, groupPlanEnabled } = await req.json();
    const recipientList = Array.from(
      new Set([
        userEmail,
        ...(groupPlanEnabled ? getConfiguredGroupParticipants() : []).filter((value: string) => value.includes("@")),
      ])
    );

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const messageParts = [
      "From: " + userEmail,
      "To: " + recipientList.join(", "),
      "Subject: " + (subject || "Your VoyagerAI 2.0 Itinerary"),
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      htmlBody,
    ];

    const rawMessage = messageParts.join("\r\n");
    const encoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    return Response.json({
      success: true,
      message: `Itinerary emailed to ${recipientList.join(", ")}.`,
    });
  } catch (error: any) {
    console.error("Email Send Error:", error);
    return Response.json(
      { error: "Failed to send email: " + error.message },
      { status: 500 }
    );
  }
}
