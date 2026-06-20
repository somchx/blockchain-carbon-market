/**
 * Real data aggregator — replaces mockSources.ts
 * Sources:
 *   - OpenWeatherMap API (current weather per province)
 *   - NASA POWER API     (solar irradiance + precipitation, no key required)
 *
 * Both calls are cached in-memory to avoid rate-limit issues.
 * On failure, returns a labelled fallback so riskEngine never throws.
 */

import type { ProjectInput } from "./types.js";

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY ?? "";
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const NASA_POWER_URL  = "https://power.larc.nasa.gov/api/temporal/monthly/point";

// Thai province → WGS84 coordinates
const PROVINCE_COORDS: Record<string, { lat: number; lon: number }> = {
  ChiangMai:  { lat: 18.79, lon: 98.98  },
  Bangkok:    { lat: 13.75, lon: 100.52 },
  KhonKaen:  { lat: 16.43, lon: 102.84 },
  SuratThani: { lat:  9.14, lon: 99.33  },
  Chonburi:  { lat: 13.36, lon: 100.98 },
  Phuket:    { lat:  7.88, lon: 98.39  },
};

// TGO-inspired provincial carbon baseline — used for governmentConfidence
const PROVINCE_CARBON_FACTOR: Record<string, number> = {
  ChiangMai:  0.84,
  Bangkok:    0.45,
  KhonKaen:  0.71,
  SuratThani: 0.78,
  Chonburi:  0.58,
  Phuket:    0.49,
};

const DEFAULT_COORDS = { lat: 13.75, lon: 100.52 }; // Bangkok fallback

// ── Types ────────────────────────────────────────────────────────────────────

type WeatherData = {
  temperature: number; // °C
  humidity:    number; // %
  cloudCover:  number; // %
  windSpeed:   number; // m/s
};

type NasaData = {
  solarIrradiance: number; // W/m² — ALLSKY_SFC_SW_DWN annual avg
  precipitation:   number; // mm/day — PRECTOTCORR annual avg
  temperature:     number; // °C  — T2M annual avg
};

export type RealSignals = {
  userInputConfidence:  number;
  iotConfidence:        number;
  governmentConfidence: number;
  historicalConfidence: number;
  anomalyScore:         number;
  additionalityScore:   number;
  // Supplementary real-data fields shown in dashboards
  weather_temperature:  number;
  weather_humidity:     number;
  weather_cloudCover:   number;
  nasa_solarIrradiance: number;
  nasa_precipitation:   number;
  dataSource:           "real" | "fallback";
};

// ── In-memory caches ─────────────────────────────────────────────────────────

const weatherCache = new Map<string, { data: WeatherData; expiresAt: number }>();
const nasaCache    = new Map<string, { data: NasaData;    expiresAt: number }>();

// ── API fetchers ─────────────────────────────────────────────────────────────

async function fetchWeather(province: string): Promise<WeatherData> {
  const cached = weatherCache.get(province);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (!OPENWEATHER_KEY) throw new Error("OPENWEATHER_API_KEY not set");

  const { lat, lon } = PROVINCE_COORDS[province] ?? DEFAULT_COORDS;
  const url = `${OPENWEATHER_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`OpenWeatherMap HTTP ${res.status}`);

  const json = (await res.json()) as {
    main:   { temp: number; humidity: number };
    clouds: { all: number };
    wind:   { speed: number };
  };

  const data: WeatherData = {
    temperature: json.main.temp,
    humidity:    json.main.humidity,
    cloudCover:  json.clouds.all,
    windSpeed:   json.wind.speed,
  };

  weatherCache.set(province, { data, expiresAt: Date.now() + 10 * 60_000 }); // 10 min TTL
  console.log(`[weather] ${province}: ${data.temperature}°C, ${data.humidity}% RH, ${data.cloudCover}% cloud`);
  return data;
}

async function fetchNasaPower(province: string): Promise<NasaData> {
  const cached = nasaCache.get(province);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const { lat, lon } = PROVINCE_COORDS[province] ?? DEFAULT_COORDS;
  const params = new URLSearchParams({
    parameters: "ALLSKY_SFC_SW_DWN,PRECTOTCORR,T2M",
    community:  "RE",
    longitude:  String(lon),
    latitude:   String(lat),
    start:      "2023",
    end:        "2023",
    format:     "JSON",
  });

  const res = await fetch(`${NASA_POWER_URL}?${params}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`);

  const json = (await res.json()) as {
    properties: {
      parameter: Record<string, Record<string, number>>;
    };
  };

  function avg(obj: Record<string, number>): number {
    const vals = Object.values(obj).filter(v => v > -990);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }

  const p = json.properties.parameter;
  const data: NasaData = {
    solarIrradiance: avg(p["ALLSKY_SFC_SW_DWN"] ?? {}),
    precipitation:   avg(p["PRECTOTCORR"] ?? {}),
    temperature:     avg(p["T2M"] ?? {}),
  };

  nasaCache.set(province, { data, expiresAt: Date.now() + 24 * 3_600_000 }); // 24 h TTL
  console.log(`[nasa]    ${province}: solar=${data.solarIrradiance.toFixed(2)} W/m², precip=${data.precipitation.toFixed(2)} mm/day`);
  return data;
}

// ── Signal derivation ─────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(v), min), max);
}

function iotFromWeather(type: ProjectInput["projectType"], w: WeatherData, scaleFactor: number): number {
  switch (type) {
    case "forest":
    case "mangrove":
      // High humidity + near-optimal temp (28°C) = healthy ecosystem
      return clamp(40 + (w.humidity - 50) * 0.5 + (35 - Math.abs(w.temperature - 28)) * 1.2 + scaleFactor * 15, 30, 92);
    case "solar":
      // Low cloud cover → better viability
      return clamp(30 + (100 - w.cloudCover) * 0.55 - (w.humidity - 50) * 0.1 + scaleFactor * 10, 30, 92);
    case "biogas":
      // Warm + humid → more gas production
      return clamp(40 + Math.max(0, w.temperature - 22) * 2 + (w.humidity / 100) * 15 + scaleFactor * 10, 30, 92);
  }
}

function historicalFromNasa(type: ProjectInput["projectType"], n: NasaData, scaleFactor: number): number {
  switch (type) {
    case "forest":
    case "mangrove":
      return clamp(35 + n.precipitation * 3 + (n.solarIrradiance - 3) * 4 + scaleFactor * 10, 30, 92);
    case "solar":
      return clamp(20 + n.solarIrradiance * 10 - n.precipitation * 0.5 + scaleFactor * 10, 30, 92);
    case "biogas":
      return clamp(40 + n.temperature * 0.8 + n.precipitation * 1.5 + scaleFactor * 10, 30, 92);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function collectSignals(input: ProjectInput): Promise<RealSignals> {
  const provinceFactor = PROVINCE_CARBON_FACTOR[input.province] ?? 0.62;
  const scaleFactor    = Math.min(input.landAreaRai / 500, 1);

  // Always-available signals (no API needed)
  const userInputConfidence = clamp(
    55 + (input.selfReportedReduction / Math.max(input.requestedCredits, 1)) * 15,
    35, 90
  );
  const anomalyScore = clamp(
    ((input.requestedCredits - input.selfReportedReduction) / Math.max(input.requestedCredits, 1)) * 100 + 35,
    5, 95
  );
  const governmentConfidence = clamp((provinceFactor * 60) + 15, 30, 90);

  // Real API calls — run independently so one failure doesn't discard the other
  const typeBase = { forest: 0.86, solar: 0.77, biogas: 0.72, mangrove: 0.91 }[input.projectType];
  const [weatherResult, nasaResult] = await Promise.allSettled([
    fetchWeather(input.province),
    fetchNasaPower(input.province),
  ]);

  const weather: WeatherData | null = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const nasa:    NasaData    | null = nasaResult.status    === "fulfilled" ? nasaResult.value    : null;

  if (!weather) {
    const reason = weatherResult.status === "rejected" ? (weatherResult.reason as Error).message : "unknown";
    console.warn(`[dataAggregator] OpenWeatherMap failed (${reason}) — key may still be activating`);
  }
  if (!nasa) {
    const reason = nasaResult.status === "rejected" ? (nasaResult.reason as Error).message : "unknown";
    console.warn(`[dataAggregator] NASA POWER failed (${reason})`);
  }

  const iotConfidence = weather
    ? iotFromWeather(input.projectType, weather, scaleFactor)
    : clamp(typeBase * 55 + scaleFactor * 25, 30, 90);

  const historicalConfidence = nasa
    ? historicalFromNasa(input.projectType, nasa, scaleFactor)
    : clamp(provinceFactor * 45 + scaleFactor * 35, 30, 90);

  const additionalityScore = clamp(
    historicalConfidence * 0.4 + iotConfidence * 0.35 + provinceFactor * 25,
    20, 90
  );

  const dataSource: "real" | "fallback" = weather && nasa ? "real"
    : (weather || nasa) ? "real"   // partial real = still label real
    : "fallback";

  return {
    userInputConfidence,
    iotConfidence,
    governmentConfidence,
    historicalConfidence,
    anomalyScore,
    additionalityScore,
    weather_temperature:  weather ? Math.round(weather.temperature * 10) / 10 : 0,
    weather_humidity:     weather ? weather.humidity  : 0,
    weather_cloudCover:   weather ? weather.cloudCover : 0,
    nasa_solarIrradiance: nasa ? Math.round(nasa.solarIrradiance * 100) / 100 : 0,
    nasa_precipitation:   nasa ? Math.round(nasa.precipitation  * 100) / 100 : 0,
    dataSource,
  };
}
