'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TripDay {
  day: number;
  date: string;
  title: string;
  activities: string[];
  location: string;
  routeUrl?: string;
}

interface TripData {
  tripTitle: string;
  destination: string;
  dates: { start: string; end: string };
  days: TripDay[];
  thingsToDo?: string[];
  budget: string;
  vibe: string;
}

interface FlightLinkData {
  searchUrl: string;
  originAirport?: { airportId?: string; airportName?: string };
  destinationAirport?: { airportId?: string; airportName?: string };
}

interface FlightLegLink {
  title: string;
  searchUrl: string;
  originAirport?: { airportId?: string; airportName?: string };
  destinationAirport?: { airportId?: string; airportName?: string };
  date: string;
}

export default function Chat() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [actionStatus, setActionStatus] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!loading && inputRef.current) inputRef.current.focus();
  }, [loading]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
            );
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.county || '';
            const state = data.address?.state || '';
            const country = data.address?.country || '';
            setUserLocation([city, state, country].filter(Boolean).join(', '));
          } catch {
            setUserLocation('Unknown');
          }
        },
        () => {
          fetch('https://ipapi.co/json/')
            .then((response) => response.json())
            .then((data) => {
              setUserLocation([data.city, data.region, data.country_name].filter(Boolean).join(', '));
            })
            .catch(() => setUserLocation('Unknown'));
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speak = async (text: string) => {
    if (typeof window === 'undefined') return;

    stopAudio();
    setIsSpeaking(true);
    setSubtitle(text.replace(/```[\s\S]*?```/g, '').replace(/[*#_`]/g, '').substring(0, 200));

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        setIsSpeaking(false);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('audio')) {
        setIsSpeaking(false);
        return;
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  const extractTripData = (content: string): TripData | null => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return null;
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.tripTitle && parsed.days) return parsed;
    } catch {}
    return null;
  };

  const containsTripData = (content: string) => extractTripData(content) !== null;

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    stopAudio();

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setSubtitle('Thinking...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userLocation,
          groupPlan: { enabled: false },
        }),
      });
      const data = await res.json();
      const reply = data.reply || 'Sorry, something went wrong.';
      const extracted = extractTripData(reply);
      const updatedMessages = extracted
        ? [...newMessages.filter((message) => !(message.role === 'assistant' && containsTripData(message.content))), { role: 'assistant', content: reply }]
        : [...newMessages, { role: 'assistant', content: reply }];

      setMessages(updatedMessages);
      speak(reply);

      if (extracted) {
        setTripData(extracted);
        setActionStatus('');
      }
    } catch {
      const errMsg = 'Connection error. Please try again.';
      setMessages([...newMessages, { role: 'assistant', content: errMsg }]);
      setSubtitle(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    stopAudio();

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setSubtitle('Listening...');
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setSubtitle('');
    };
    recognition.onerror = () => setSubtitle('');
    recognition.start();
  };

  const emailItinerary = async () => {
    if (!tripData) return;
    setActionStatus('Sending email...');
    try {
      const flightLinks = await buildFlightLinksForTrip(tripData);
      const htmlBody = buildEmailHtml(tripData, flightLinks);
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `${tripData.tripTitle} - Your TripPilot Itinerary`,
          htmlBody,
          groupPlanEnabled: false,
        }),
      });
      const data = await res.json();
      setActionStatus(data.success ? data.message : data.error || 'Failed');
    } catch {
      setActionStatus('Failed to send email');
    }
  };

  const addToCalendar = async () => {
    if (!tripData) return;
    setActionStatus('Updating calendar...');
    try {
      const events = tripData.days.map((day) => {
        let description = `Trip: ${tripData.tripTitle}\nDay ${day.day}\n\n- ${day.activities.join('\n- ')}`;
        if (day.routeUrl) {
          description += `\n\nGoogle Maps Route: ${day.routeUrl}`;
        }
        return {
          summary: day.title,
          description,
          startDate: day.date,
          endDate: day.date,
          location: day.location || tripData.destination,
          tripId: tripData.tripTitle,
          dayNumber: day.day,
          routeUrl: day.routeUrl || '',
        };
      });

      const res = await fetch('/api/calendar/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events,
          groupPlanEnabled: false,
        }),
      });
      const data = await res.json();
      setActionStatus(data.success ? data.message : data.error || 'Failed');
    } catch {
      setActionStatus('Failed to update calendar');
    }
  };

  const buildFlightLinksForTrip = async (trip: TripData): Promise<FlightLegLink[]> => {
    const origin = userLocation || 'Phoenix, Arizona';
    const stops = trip.days.reduce<{ location: string; date: string }[]>((acc, day) => {
      const normalizedLocation = (day.location || trip.destination).trim();
      if (!normalizedLocation) return acc;
      if (acc.length === 0 || acc[acc.length - 1].location !== normalizedLocation) {
        acc.push({ location: normalizedLocation, date: day.date });
      }
      return acc;
    }, []);

    if (stops.length === 0) {
      return [];
    }

    const legs: Array<{ originQuery: string; destinationQuery: string; date: string; title: string }> = [];
    legs.push({
      originQuery: origin,
      destinationQuery: stops[0].location,
      date: trip.dates.start,
      title: `Outbound: ${origin} to ${stops[0].location}`,
    });

    for (let i = 1; i < stops.length; i += 1) {
      legs.push({
        originQuery: stops[i - 1].location,
        destinationQuery: stops[i].location,
        date: stops[i].date,
        title: `Intercity: ${stops[i - 1].location} to ${stops[i].location}`,
      });
    }

    legs.push({
      originQuery: stops[stops.length - 1].location,
      destinationQuery: origin,
      date: trip.dates.end,
      title: `Return: ${stops[stops.length - 1].location} to ${origin}`,
    });

    const results = await Promise.all(
      legs.map(async (leg) => {
        try {
          const flightRes = await fetch('/api/flights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originQuery: leg.originQuery,
              destinationQuery: leg.destinationQuery,
              startDate: leg.date,
              oneWay: true,
            }),
          });
          const flightData = await flightRes.json();
          if (!flightRes.ok) return null;
          return {
            title: leg.title,
            date: leg.date,
            searchUrl: flightData.searchUrl,
            originAirport: flightData.originAirport,
            destinationAirport: flightData.destinationAirport,
          } satisfies FlightLegLink;
        } catch {
          return null;
        }
      })
    );

    return results.filter((result): result is FlightLegLink => Boolean(result));
  };

  const buildEmailHtml = (trip: TripData, flightLinks: FlightLegLink[]): string => {
    let html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">';
    html += `<h1 style="color:#238636;">${trip.tripTitle}</h1>`;
    html += `<p><strong>Destination:</strong> ${trip.destination}</p>`;
    html += `<p><strong>Dates:</strong> ${trip.dates.start} to ${trip.dates.end}</p>`;
    html += `<p><strong>Budget:</strong> ${trip.budget} | <strong>Style:</strong> ${trip.vibe}</p>`;
    if (flightLinks.length > 0) {
      html += '<hr style="border:1px solid #eee;margin:20px 0;">';
      html += `<h2 style="color:#1a73e8;">Flight Links</h2>`;
      html += '<ul>';
      for (const leg of flightLinks) {
        const airportText = leg.originAirport?.airportId && leg.destinationAirport?.airportId
          ? `${leg.originAirport.airportName} (${leg.originAirport.airportId}) to ${leg.destinationAirport.airportName} (${leg.destinationAirport.airportId})`
          : '';
        html += `<li style="margin-bottom:10px;"><strong>${leg.title}</strong> - ${leg.date}`;
        if (airportText) {
          html += `<br/>${airportText}`;
        }
        html += `<br/><a href="${leg.searchUrl}" target="_blank" rel="noopener noreferrer">Open Google Flights search</a></li>`;
      }
      html += '</ul>';
    }

    if (trip.thingsToDo && trip.thingsToDo.length > 0) {
      html += '<hr style="border:1px solid #eee;margin:20px 0;">';
      html += '<h2 style="color:#d4380d;">Things To Do Before Your Trip</h2>';
      html += '<ol>';
      for (const item of trip.thingsToDo) {
        html += `<li style="margin-bottom:8px;">${item}</li>`;
      }
      html += '</ol>';
    }

    html += '<hr style="border:1px solid #eee;margin:20px 0;">';
    for (const day of trip.days) {
      html += `<h2 style="color:#1a73e8;">${day.title}</h2>`;
      html += `<p style="color:#666;">${day.date}${day.location ? ` - ${day.location}` : ''}</p>`;
      html += '<ul>';
      for (const act of day.activities) {
        html += `<li>${act}</li>`;
      }
      html += '</ul>';
      if (day.routeUrl) {
        html += `<p><a href="${day.routeUrl}" target="_blank" rel="noopener noreferrer">Open Google Maps route for Day ${day.day}</a></p>`;
      }
    }
    html += '<hr style="border:1px solid #eee;margin:20px 0;">';
    html += '<p style="color:#888;font-size:12px;">Generated by TripPilot AI</p>';
    html += '</div>';
    return html;
  };

  const renderMessage = (content: string) => content.replace(/```json[\s\S]*?```/g, '').trim();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-lg text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-8" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/imgs/testbot.webp" alt="TripPilot Bot" className="h-32 w-32 rounded-full border-4 border-emerald-400/30" />
          <h1 className="text-4xl font-bold text-white">TripPilot</h1>
          <p className="max-w-md text-center text-gray-400">Your AI travel planner. Connect your Google Calendar and let me handle the rest.</p>
        </div>
        <button
          onClick={() => signIn('google')}
          className="cursor-pointer rounded-full bg-white px-8 py-4 text-lg font-semibold text-gray-900 shadow-lg transition-transform hover:scale-105"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const displaySubtitle = subtitle || (
    lastAssistant
      ? lastAssistant.content.replace(/```json[\s\S]*?```/g, '').substring(0, 200)
      : "Hi! I'm TripPilot. Tell me when you'd like to travel!"
  );

  return (
    <div className="flex h-screen w-full" style={{ background: '#0d1117' }}>
      <div className="relative flex w-[45%] flex-col items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a2332 0%, #0d1117 100%)' }}>
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(125,211,160,0.08) 0%, transparent 70%)',
            opacity: isSpeaking ? 1 : 0,
          }}
        />

        <h1 className="z-10 mb-10 text-3xl font-bold" style={{ background: 'linear-gradient(90deg, #7dd3a0, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          TripPilot
        </h1>

        <div className={`relative z-10 h-64 w-64 overflow-hidden rounded-full border-4 transition-all duration-500 ${isSpeaking ? 'border-emerald-400 ring-pulse' : 'border-gray-700'}`}>
          <img src="/imgs/testbot.webp" alt="TripPilot Bot" className="h-full w-full object-cover" />
        </div>

        <div className="z-10 mt-10 mx-8 flex min-h-[70px] max-w-[90%] items-center justify-center rounded-2xl border p-5 text-center" style={{ background: 'rgba(28,35,51,0.8)', borderColor: '#30363d', backdropFilter: 'blur(8px)' }}>
          <p className="text-base leading-relaxed text-gray-300">
            {displaySubtitle.length > 200 ? `${displaySubtitle.substring(0, 200)}...` : displaySubtitle}
          </p>
        </div>

        <button
          onClick={() => {
            if (lastAssistant) speak(lastAssistant.content);
          }}
          className="z-10 mt-4 cursor-pointer text-xs text-gray-500 transition-colors hover:text-emerald-400"
        >
          Replay last response
        </button>

        <div className="absolute bottom-4 z-10 text-xs text-gray-600">
          Connected as {session.user?.email}
        </div>
      </div>

      <div className="flex flex-1 flex-col border-l" style={{ borderColor: '#30363d', background: '#0f141b' }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#30363d', background: '#0d1117' }}>
          <div>
            <h2 className="text-lg font-semibold text-white">Trip Planner</h2>
            <p className="text-xs text-gray-500">Powered by Groq + Google Calendar</p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'rgba(125,211,160,0.3)', background: 'rgba(125,211,160,0.1)', color: '#7dd3a0' }}>
            Live
          </span>
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="max-w-xl text-center text-gray-500">
                <p className="mb-2 text-lg">Welcome to TripPilot</p>
                <p className="text-sm">Tell me roughly when you want to travel, like &quot;I&apos;m thinking about a fall trip&quot; or &quot;I&apos;m free next month&quot;.</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
              <div
                className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={
                  message.role === 'user'
                    ? { background: '#238636', color: '#fff', borderBottomRightRadius: '4px' }
                    : { background: '#1c2333', border: '1px solid #30363d', color: '#e6edf3', borderBottomLeftRadius: '4px' }
                }
              >
                {renderMessage(message.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start fade-in-up">
              <div className="flex items-center gap-1.5 rounded-2xl px-5 py-4" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
                <span className="typing-dot h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="typing-dot h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="typing-dot h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>
            </div>
          )}

          {tripData && (
            <div className="fade-in-up mt-2 rounded-2xl border p-4" style={{ background: '#1c2333', borderColor: '#30363d' }}>
              <p className="mb-3 text-sm font-semibold text-emerald-400">Trip finalized. What would you like to do?</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={emailItinerary}
                  className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all hover:scale-105"
                  style={{ background: '#238636', color: '#fff' }}
                >
                  Email itinerary
                </button>
                <button
                  onClick={addToCalendar}
                  className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all hover:scale-105"
                  style={{ background: '#1a73e8', color: '#fff' }}
                >
                  Update calendar
                </button>
              </div>
              {actionStatus && (
                <p className="mt-3 text-sm text-gray-300">{actionStatus}</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: '#30363d', background: '#0d1117' }}>
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <button
              type="button"
              onClick={startListening}
              className="cursor-pointer rounded-full border p-3 transition-colors hover:border-emerald-400 hover:text-emerald-400"
              style={{ background: '#1c2333', borderColor: '#30363d', color: '#8b949e' }}
              title="Voice input"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about your travel plans..."
              disabled={loading}
              className="flex-1 rounded-full px-5 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all disabled:opacity-50"
              style={{ background: '#1c2333', border: '2px solid #30363d' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7dd3a0';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#30363d';
              }}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="cursor-pointer rounded-full p-3 transition-all disabled:opacity-30"
              style={{ background: input.trim() ? '#238636' : '#1c2333', color: '#fff' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
