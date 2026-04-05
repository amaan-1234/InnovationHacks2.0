'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TripActivity {
  name: string;
  description: string;
}

interface TripDay {
  day: number;
  date: string;
  title: string;
  activities: TripActivity[];
  location: string;
  routeUrl?: string;
}

interface TripData {
  tripTitle: string;
  destination: string;
  youtubeVideoQuery?: string;
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
  const router = useRouter();
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

  const downloadPdf = () => {
    if (!tripData) return;
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(35, 134, 54);
    doc.text(tripData.tripTitle, 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Destination: ${tripData.destination}`, 20, y);
    y += 7;
    doc.text(`Dates: ${tripData.dates.start} to ${tripData.dates.end}`, 20, y);
    y += 7;
    doc.text(`Budget: ${tripData.budget} | Vibe: ${tripData.vibe}`, 20, y);
    y += 15;

    // Things to do
    if (tripData.thingsToDo && tripData.thingsToDo.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(212, 56, 13);
      doc.text("Before Your Trip", 20, y);
      y += 10;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      tripData.thingsToDo.forEach((item) => {
        const lines = doc.splitTextToSize(`- ${item}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 6;
      });
      y += 10;
    }

    // Days
    tripData.days.forEach((day) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(16);
      doc.setTextColor(26, 115, 232);
      doc.text(`Day ${day.day}: ${day.title}`, 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`${day.date} • ${day.location || tripData.destination}`, 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      day.activities.forEach((act) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const nameLines = doc.splitTextToSize(`* ${act.name}`, 170);
        doc.setFont("helvetica", "bold");
        doc.text(nameLines, 20, y);
        y += nameLines.length * 5;
        
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(act.description, 160);
        doc.text(descLines, 25, y);
        y += descLines.length * 5 + 5;
      });
      y += 5;
    });

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by VoyagerAI 2.0", 20, 285);

    doc.save(`${tripData.tripTitle.replace(/\s+/g, '_')}_Itinerary.pdf`);
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
      const updatedMessages: ChatMessage[] = extracted
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
      setMessages([...newMessages, { role: 'assistant', content: errMsg } as ChatMessage]);
      setSubtitle(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const generateMapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const generateReviewsUrl = (query: string) => `https://www.google.com/search?q=${encodeURIComponent(query + ' reviews')}`;
  const generateYoutubeUrl = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

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
          subject: `${tripData.tripTitle} - Your VoyagerAI 2.0 Itinerary`,
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
        let description = `Trip: ${tripData.tripTitle}\nDay ${day.day}\n\n` + 
          day.activities.map(a => `- ${a.name}: ${a.description}`).join('\n');
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
          } as FlightLegLink;
        } catch {
          return null;
        }
      })
    );

    return results.filter((result): result is FlightLegLink => result !== null);
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
      for (const act of day.activities) {
        html += `<div style="margin-bottom:12px;">`;
        html += `<p style="margin:0;"><strong>${act.name}</strong></p>`;
        html += `<p style="margin:4px 0 0;font-size:14px;color:#444;">${act.description}</p>`;
        html += `<p style="margin:6px 0 0;font-size:13px;"><a href="${generateMapsUrl(act.name)}">Maps</a> | <a href="${generateReviewsUrl(act.name)}">Reviews</a></p>`;
        html += `</div>`;
      }
      if (day.routeUrl) {
        html += `<p><a href="${day.routeUrl}" target="_blank" rel="noopener noreferrer">Open Google Maps route for Day ${day.day}</a></p>`;
      }
    }
    if (trip.youtubeVideoQuery) {
        html += '<hr style="border:1px solid #eee;margin:20px 0;">';
        html += `<h2 style="color:red;">Recommended Travel Video</h2>`;
        html += `<p><a href="${generateYoutubeUrl(trip.youtubeVideoQuery)}">Watch travel video for ${trip.destination}</a></p>`;
    }
    html += '<hr style="border:1px solid #eee;margin:20px 0;">';
    html += '<p style="color:#888;font-size:12px;">Generated by VoyagerAI 2.0</p>';
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
      <div className="flex h-screen flex-col items-center justify-center gap-8 bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <img src="/imgs/testbot.webp" alt="VoyagerAI Bot" className="h-32 w-32 rounded-full border-4 border-accent/30" />
          <h1 className="text-4xl font-outfit font-bold text-text-primary tracking-tight">Voyager<span className="gradient-text">AI</span> 2.0</h1>
          <p className="max-w-md text-center text-text-secondary">Your AI travel planner. Connect your Google Calendar and let me handle the rest.</p>
        </div>
        <button
          onClick={() => signIn('google')}
          className="cursor-pointer rounded-full bg-white px-8 py-4 text-lg font-semibold text-gray-900 shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition-transform hover:scale-105"
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
      : "Hi! I'm VoyagerAI 2.0. Tell me when you'd like to travel!"
  );

  return (
    <div className="flex h-screen w-full bg-bg-base">
      <div className="relative flex w-[45%] flex-col items-center justify-center overflow-hidden bg-bg-surface border-r border-border-subtle">
        
        {/* Back to Home Button */}
        <button
          onClick={() => {
            stopAudio();
            router.push('/');
          }}
          className="absolute top-6 left-6 z-20 flex cursor-pointer items-center gap-2 rounded-full border border-border-subtle bg-bg-card/50 px-4 py-2 text-sm font-medium text-text-secondary backdrop-blur-md transition-all hover:scale-105 hover:border-accent hover:text-text-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Home
        </button>

        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(99,102,241,0.1) 0%, transparent 70%)',
            opacity: isSpeaking ? 1 : 0,
          }}
        />

        <h1 className="z-10 mb-10 text-4xl font-outfit font-bold text-text-primary tracking-tight">
          Voyager<span className="gradient-text">AI</span> <span className="text-text-muted font-medium text-2xl">2.0</span>
        </h1>

        <div className={`relative z-10 h-64 w-64 overflow-hidden rounded-full border-4 transition-all duration-500 ${isSpeaking ? 'border-accent ring-pulse' : 'border-border-subtle'}`}>
          <img src="/imgs/testbot.webp" alt="VoyagerAI Bot" className="h-full w-full object-cover" />
        </div>

        <div className="z-10 mt-10 mx-8 flex min-h-[70px] max-w-[90%] items-center justify-center rounded-2xl border p-5 text-center bg-bg-card border-border-subtle backdrop-blur-md">
          <p className="text-base leading-relaxed text-text-primary">
            {displaySubtitle.length > 200 ? `${displaySubtitle.substring(0, 200)}...` : displaySubtitle}
          </p>
        </div>

        <button
          onClick={() => {
            if (lastAssistant) speak(lastAssistant.content);
          }}
          className="z-10 mt-4 cursor-pointer text-xs text-text-muted transition-colors hover:text-accent"
        >
          Replay last response
        </button>

        <div className="absolute bottom-4 z-10 text-xs text-text-muted">
          Connected as {session.user?.email}
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-bg-base">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4 bg-bg-surface">
          <div>
            <h2 className="text-lg font-outfit font-bold tracking-tight text-text-primary">Voyager<span className="gradient-text">AI</span> 2.0</h2>
            <p className="text-xs text-text-secondary mt-0.5">Powered by Gemini + GCP + ElevenLabs</p>
          </div>
          <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent font-semibold">
            Live
          </span>
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="max-w-xl text-center text-text-secondary">
                <p className="mb-2 text-lg">Welcome to VoyagerAI 2.0</p>
                <p className="text-sm">Tell me roughly when you want to travel, like &quot;I&apos;m thinking about a fall trip&quot; or &quot;I&apos;m free next month&quot;.</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const trip = message.role === 'assistant' ? extractTripData(message.content) : null;
            return (
              <div key={index} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} fade-in-up`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    message.role === 'user'
                      ? { background: 'var(--color-accent)', color: '#fff', borderBottomRightRadius: '4px' }
                      : { background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)', borderBottomLeftRadius: '4px' }
                  }
                >
                  {renderMessage(message.content)}
                </div>

                {trip && (
                  <div className="mt-4 flex w-full max-w-[92%] flex-col gap-6 pl-2">
                    {/* YouTube Video Section */}
                    {trip.youtubeVideoQuery && (
                      <div className="rounded-xl border border-border-subtle bg-bg-card/50 p-4 backdrop-blur-md">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-tight text-accent-red">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                            <line x1="7" y1="2" x2="7" y2="22"></line>
                            <line x1="17" y1="2" x2="17" y2="22"></line>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <line x1="2" y1="7" x2="7" y2="7"></line>
                            <line x1="2" y1="17" x2="7" y2="17"></line>
                            <line x1="17" y1="17" x2="22" y2="17"></line>
                            <line x1="17" y1="7" x2="22" y2="7"></line>
                          </svg>
                          Recommended Travel Videos
                        </h3>
                        <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border-subtle bg-black">
                          <a 
                            href={generateYoutubeUrl(trip.youtubeVideoQuery)} 
                            target="_blank" 
                            className="absolute inset-0 z-20 flex transform items-center justify-center transition-all duration-300 group-hover:scale-105"
                          >
                            <div className="flex h-14 w-20 items-center justify-center rounded-2xl bg-red-600 shadow-xl transition-all group-hover:bg-red-500">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <polygon points="10 8 16 12 10 16 10 8"></polygon>
                              </svg>
                            </div>
                          </a>
                          <img 
                            src={`https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop`} 
                            className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-110" 
                            alt="Travel Preview" 
                          />
                          <div className="absolute bottom-4 left-4 z-10">
                            <p className="text-xs font-bold text-white drop-shadow-md">Best Things To Do In {trip.destination}</p>
                            <p className="text-[10px] text-gray-300">Watch Guide on YouTube</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Itinerary Days */}
                    {trip.days.map((day) => (
                      <div key={day.day} className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
                        <div className="mb-5 flex items-center justify-between border-b border-border-subtle pb-4">
                          <div>
                            <h3 className="text-lg font-outfit font-bold tracking-tight text-accent">Day {day.day}</h3>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted mt-1">
                              {day.date} • 📍 {day.location || trip.destination}
                            </p>
                          </div>
                          {day.routeUrl && (
                            <a 
                              href={day.routeUrl} 
                              target="_blank" 
                              className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                                <line x1="8" y1="2" x2="8" y2="18"></line>
                                <line x1="16" y1="6" x2="16" y2="22"></line>
                              </svg>
                              Route
                            </a>
                          )}
                        </div>

                        <div className="flex flex-col gap-4">
                          {day.activities.map((act, i) => (
                            <div key={i} className="group relative rounded-xl border border-border-subtle bg-bg-card px-4 py-4 transition-all hover:border-accent/40">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-accent-cyan">
                                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-accent-cyan/10 text-[10px]">
                                  🎯
                                </span>
                                {act.name}
                              </h4>
                              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                                {act.description}
                              </p>
                              <div className="mt-4 flex gap-2">
                                <a 
                                  href={generateMapsUrl(act.name)} 
                                  target="_blank" 
                                  className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent transition-all hover:bg-accent hover:text-white"
                                >
                                  📍 Maps
                                </a>
                                <a 
                                  href={generateReviewsUrl(act.name)} 
                                  target="_blank" 
                                  className="flex items-center gap-1.5 rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 px-3 py-1.5 text-[10px] font-bold text-accent-yellow transition-all hover:bg-accent-yellow hover:text-gray-900"
                                >
                                  ⭐ Reviews
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start fade-in-up">
              <div className="flex items-center gap-1.5 rounded-2xl px-5 py-4 bg-bg-card border border-border-subtle">
                <span className="typing-dot h-2 w-2 rounded-full bg-accent"></span>
                <span className="typing-dot h-2 w-2 rounded-full bg-accent"></span>
                <span className="typing-dot h-2 w-2 rounded-full bg-accent"></span>
              </div>
            </div>
          )}

          {tripData && (
            <div className="fade-in-up mt-4 rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <p className="mb-4 text-sm font-bold tracking-tight text-accent-cyan uppercase">VoyagerAI 2.0 Trip Dashboard</p>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={downloadPdf}
                    className="flex cursor-pointer items-center justify-center gap-3 rounded-xl bg-accent px-6 py-4 text-base font-bold text-white transition-all hover:scale-105 hover:bg-accent-glow hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download PDF Itinerary
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={emailItinerary}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-xs font-bold text-text-secondary transition-all hover:border-accent hover:text-text-primary hover:bg-accent/10"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      Email Itinerary
                    </button>
                    <button
                      onClick={addToCalendar}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-xs font-bold text-text-secondary transition-all hover:border-accent hover:text-text-primary hover:bg-accent/10"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      Save to Calendar
                    </button>
                  </div>
                </div>
                {actionStatus && (
                  <p className="mt-4 text-center text-xs font-semibold text-accent animate-pulse">
                    {actionStatus}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle px-6 py-4 bg-bg-surface">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <button
              type="button"
              onClick={startListening}
              className="cursor-pointer rounded-full border border-border-subtle bg-bg-card p-3 text-text-secondary transition-colors hover:border-accent hover:text-accent"
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
              className="flex-1 rounded-full px-5 py-3 text-sm text-text-primary bg-bg-card border-2 border-border-subtle placeholder-text-muted outline-none transition-all focus:border-accent focus:shadow-[0_0_10px_rgba(99,102,241,0.2)] disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="cursor-pointer rounded-full p-3 transition-all disabled:opacity-30"
              style={{ background: input.trim() ? 'var(--color-accent)' : 'var(--color-bg-card)', color: '#fff' }}
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
