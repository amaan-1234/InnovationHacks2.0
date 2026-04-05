import { NextRequest } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// "Adam" - A deep, default free premade voice that works on the free tier API
// It avoids the "library voices" 402 error.
const VOICE_ID = "pNInz6obpgDQGcFmaJgB";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    if (!ELEVENLABS_API_KEY) {
      console.error("[TTS] No ELEVENLABS_API_KEY set");
      return Response.json({ error: "TTS not configured" }, { status: 500 });
    }

    // Clean markdown, links, JSON blocks
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/[*#_`]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .substring(0, 1000); // Free tier: keep under char limit

    if (!cleanText) {
      return Response.json({ error: "Empty after cleaning" }, { status: 400 });
    }

    console.log("[TTS] Sending", cleanText.length, "chars to ElevenLabs");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[TTS] ElevenLabs HTTP", response.status, errBody);
      return Response.json(
        { error: "ElevenLabs error " + response.status, details: errBody },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[TTS] Got audio:", audioBuffer.byteLength, "bytes");

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[TTS] Exception:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
