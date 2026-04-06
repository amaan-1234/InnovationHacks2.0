const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_URL = "https://serpapi.com/search.json";

type SerpAutocompleteSuggestion = {
  name?: string;
  id?: string;
  airports?: Array<{
    name?: string;
    id?: string;
    city?: string;
  }>;
};

type FlightSearchBody = {
  originQuery?: string;
  destinationQuery?: string;
  startDate?: string;
  endDate?: string;
  oneWay?: boolean;
};

type SerpFlight = {
  price?: number;
  total_duration?: number;
  flights?: Array<{
    airline?: string;
    departure_airport?: { id: string; name: string; time: string };
    arrival_airport?: { id: string; name: string; time: string };
  }>;
};

type FlightOption = {
  id: "cheapest" | "shortest" | "longest";
  label: string;
  price: number | null;
  totalDurationMinutes: number | null;
  totalDurationLabel: string;
  airline: string;
  route: string;
  departureTime: string;
  arrivalTime: string;
  stopsLabel: string;
  airportSummary: string;
  searchUrl: string;
};

function formatDuration(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "Unknown";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

async function fetchSerpJson(params: Record<string, string>) {
  const url = new URL(SERPAPI_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`SerpApi request failed with status ${response.status}`);
  }
  return response.json();
}

async function resolveAirport(query: string) {
  const candidates = Array.from(
    new Set(
      [
        query,
        query.split(",").slice(0, 2).join(",").trim(),
        query.split(",")[0]?.trim() || "",
      ].filter(Boolean)
    )
  );

  for (const candidate of candidates) {
    const data = await fetchSerpJson({
      engine: "google_flights_autocomplete",
      q: candidate,
      gl: "us",
      hl: "en",
      api_key: SERPAPI_KEY || "",
    });

    const suggestions = (data.suggestions || []) as SerpAutocompleteSuggestion[];
    for (const suggestion of suggestions) {
      const airport = suggestion.airports?.find((entry) => entry.id);
      if (airport?.id) {
        return {
          airportId: airport.id,
          airportName: airport.name || airport.id,
          city: airport.city || suggestion.name || candidate,
        };
      }
    }
  }

  throw new Error(`No airport found for "${query}"`);
}

function toFlightOption(id: FlightOption["id"], label: string, flight: SerpFlight, searchUrl: string): FlightOption {
  const firstLeg = flight.flights?.[0];
  const lastLeg = flight.flights?.[flight.flights.length - 1];
  const airline = firstLeg?.airline || "Unknown airline";
  const departureAirport = firstLeg?.departure_airport?.id || "";
  const arrivalAirport = lastLeg?.arrival_airport?.id || "";
  const stops = Math.max((flight.flights?.length || 1) - 1, 0);

  return {
    id,
    label,
    price: typeof flight.price === "number" ? flight.price : null,
    totalDurationMinutes: typeof flight.total_duration === "number" ? flight.total_duration : null,
    totalDurationLabel: formatDuration(flight.total_duration),
    airline,
    route: `${firstLeg?.departure_airport?.name || "Unknown"} to ${lastLeg?.arrival_airport?.name || "Unknown"}`,
    departureTime: firstLeg?.departure_airport?.time || "Unknown",
    arrivalTime: lastLeg?.arrival_airport?.time || "Unknown",
    stopsLabel: stops === 0 ? "Nonstop" : `${stops} stop${stops === 1 ? "" : "s"}`,
    airportSummary: [departureAirport, arrivalAirport].filter(Boolean).join(" -> "),
    searchUrl,
  };
}

function selectDistinctOptions(flights: SerpFlight[], searchUrl: string) {
  const withMetrics = flights.filter((flight) => typeof flight.price === "number" && typeof flight.total_duration === "number");
  if (withMetrics.length === 0) {
    throw new Error("No flights with price and duration were returned.");
  }

  const cheapest = [...withMetrics].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
  const shortest = [...withMetrics].sort((a, b) => (a.total_duration || 0) - (b.total_duration || 0))[0];
  const longest = [...withMetrics].sort((a, b) => (b.total_duration || 0) - (a.total_duration || 0))[0];

  return [
    toFlightOption("cheapest", "Cheapest", cheapest, searchUrl),
    toFlightOption("shortest", "Shortest", shortest, searchUrl),
    toFlightOption("longest", "Longest", longest, searchUrl),
  ];
}

export async function POST(req: Request) {
  try {
    if (!SERPAPI_KEY) {
      return Response.json({ error: "SERPAPI_KEY is not configured." }, { status: 500 });
    }

    const { originQuery, destinationQuery, startDate, endDate, oneWay }: FlightSearchBody = await req.json();

    if (!originQuery || !destinationQuery || !startDate || (!endDate && !oneWay)) {
      return Response.json({ error: "Missing flight search parameters." }, { status: 400 });
    }

    const [originAirport, destinationAirport] = await Promise.all([
      resolveAirport(originQuery),
      resolveAirport(destinationQuery),
    ]);

    const flightData = await fetchSerpJson({
      engine: "google_flights",
      departure_id: originAirport.airportId,
      arrival_id: destinationAirport.airportId,
      outbound_date: startDate,
      ...(oneWay ? {} : { return_date: endDate }),
      type: oneWay ? "2" : "1",
      sort_by: "1",
      travel_class: "1",
      adults: "1",
      currency: "USD",
      hl: "en",
      gl: "us",
      deep_search: "true",
      api_key: SERPAPI_KEY,
    });

    const flights = [...(flightData.best_flights || []), ...(flightData.other_flights || [])];
    const searchUrl = flightData.search_metadata?.google_flights_url || "https://www.google.com/travel/flights";
    const options = selectDistinctOptions(flights, searchUrl);

    return Response.json({
      success: true,
      originAirport,
      destinationAirport,
      searchUrl,
      options,
    });
  } catch (err: unknown) {
    const error = err as Error;
    const fs = require('fs');
    fs.appendFileSync('flights_error.log', `[${new Date().toISOString()}] Flights API Error: ${error.message}\nStack: ${error.stack}\n\n`);
    return Response.json(
      { error: error.message || "Failed to fetch flights." },
      { status: 500 }
    );
  }
}
