import { NextRequest, NextResponse } from "next/server";
import { guard, failure } from "@/lib/security/guard";
import { captureServerError } from "@/lib/monitoring";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { AIRPORTS } from "@/lib/providers/airports";

// Destination weather for the journey screen, via Open-Meteo — free, keyless,
// so it needs no spend cap. Cached 3h per airport; coordinates come from our
// own airports table, so no geocoding call either.

export type DayForecast = {
  date: string; // YYYY-MM-DD
  maxC: number;
  minC: number;
  code: number; // WMO weather code
  precipProb: number | null;
};

type WeatherPayload = {
  current: { tempC: number; code: number };
  daily: DayForecast[];
};

export async function GET(req: NextRequest) {
  const g = await guard(req, "search");
  if (!g.ok) return g.response;

  const code = (new URL(req.url).searchParams.get("code") ?? "").toUpperCase();
  const airport = AIRPORTS.find((a) => a.iata === code);
  if (!airport) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }

  const cacheKey = `weather:${code}`;
  const cached = await cacheGet<WeatherPayload>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const qs = new URLSearchParams({
      latitude: String(airport.lat),
      longitude: String(airport.lng),
      current: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "7",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return failure("Weather unavailable");
    const json = await res.json();

    const daily: DayForecast[] = (json.daily?.time ?? []).map((date: string, i: number) => ({
      date,
      maxC: Math.round(json.daily.temperature_2m_max?.[i] ?? 0),
      minC: Math.round(json.daily.temperature_2m_min?.[i] ?? 0),
      code: json.daily.weather_code?.[i] ?? 0,
      precipProb: json.daily.precipitation_probability_max?.[i] ?? null,
    }));
    const payload: WeatherPayload = {
      current: {
        tempC: Math.round(json.current?.temperature_2m ?? 0),
        code: json.current?.weather_code ?? 0,
      },
      daily,
    };
    await cacheSet(cacheKey, payload, 3 * HOURS);
    return NextResponse.json(payload);
  } catch (err) {
    captureServerError("weather", err);
    return failure("Weather unavailable");
  }
}
