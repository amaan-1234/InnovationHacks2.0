# TripPilot — AI Travel Planning Agent

> An intelligent, voice-enabled travel planner that checks your Google Calendar, suggests optimal travel windows, and builds a complete trip itinerary through a conversational chatbot interface.

## 🎯 What It Does

TripPilot is a split-screen web app featuring an animated AI avatar on the left and a smart chat interface on the right. The agent orchestrates a full trip-planning flow:

1. **Greets the user** and asks about their preferred travel timeframe
2. **Checks Google Calendar** to find available date windows (real API integration)
3. **Suggests destinations** and checks visa/passport requirements
4. **Discusses budget & trip style** (food, adventure, business, leisure)
5. **Generates a day-by-day itinerary** with YouTube video embeds for major attractions
6. **Produces a structured trip document** with booking links and next steps

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│               Frontend                   │
│  Next.js 16 (App Router) + Tailwind     │
│  Split-screen: Avatar | Chat            │
│  Web Speech API for TTS + STT           │
├─────────────────────────────────────────┤
│              API Layer                   │
│  /api/chat → Groq (Llama 3.3 70B)      │
│  /api/auth → NextAuth + Google OAuth    │
│  Calendar data injected as context      │
├─────────────────────────────────────────┤
│           External Services              │
│  Google Calendar API (readonly)          │
│  Groq Cloud (LLM inference)             │
└─────────────────────────────────────────┘
```

## 🛡️ Guardrails

- **Topic Scoping**: The agent refuses all non-travel queries
- **Sequential Flow**: Steps are enforced in order — the agent won't skip ahead
- **No Hallucinations**: The agent never invents prices, visa rules, or bookings
- **Calendar Grounding**: Availability suggestions are based on real calendar data

## 🔧 Setup

```bash
# Clone and install
npm install

# Set environment variables in .env
GROQ_API_KEY=your_groq_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=any_random_secret
NEXTAUTH_URL=http://localhost:3000

# Run dev
npm run dev
```

### Google Cloud Setup
1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Create OAuth 2.0 credentials (Web Application type)
4. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
5. Add your email as a **Test User** under the OAuth consent screen

## 🚀 Deploy to Vercel

1. Push to GitHub
2. Import into Vercel
3. Add all `.env` variables in Vercel dashboard
4. Update `NEXTAUTH_URL` to your Vercel domain
5. Update Google Cloud redirect URI to `https://your-domain.vercel.app/api/auth/callback/google`

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| LLM | Groq (Llama 3.3 70B Versatile) |
| Auth | NextAuth.js + Google OAuth |
| Calendar | Google Calendar API v3 |
| Voice | Web Speech API (TTS + STT) |
| Deployment | Vercel |

## 📄 License

Built for InnovationHacks 2.0
