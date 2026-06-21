/**
 * Real data aggregator
 * Sources:
 *   - OpenWeatherMap API   (current weather per province)
 *   - NASA POWER API       (solar irradiance + precipitation, no key required)
 *   - NASA MODIS MOD13Q1   (NDVI — real vegetation index, no key required)
 *   - NASA MODIS MCD12Q1   (Land Cover type — cross-validates project claim, no key required)
 *
 * All calls are cached in-memory to avoid rate-limit issues.
 * On failure each source returns null so riskEngine never throws.
 */

import type { ProjectInput } from "./types.js";

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY ?? "";
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const NASA_POWER_URL  = "https://power.larc.nasa.gov/api/temporal/monthly/point";
const MODIS_URL       = "https://modis.ornl.gov/rst/api/v1";

// Thai province → WGS84 coordinates
const PROVINCE_COORDS: Record<string, { lat: number; lon: number }> = {
  ChiangMai:  { lat: 18.79, lon: 98.98  },
  Bangkok:    { lat: 13.75, lon: 100.52 },
  KhonKaen:  { lat: 16.43, lon: 102.84 },
  SuratThani: { lat:  9.14, lon: 99.33  },
  Chonburi:  { lat: 13.36, lon: 100.98 },
  Phuket:    { lat:  7.88, lon: 98.39  },
};

const DEFAULT_COORDS = { lat: 13.75, lon: 100.52 }; // Bangkok fallback

// ── MODIS Land Cover IGBP class → category ───────────────────────────────────
// LC_Type1 uses IGBP classification (1–17)
const LC_CATEGORY: Record<number, "forest" | "shrub" | "grass" | "crop" | "urban" | "water" | "barren"> = {
  1:  "forest",   // Evergreen Needleleaf Forests
  2:  "forest",   // Evergreen Broadleaf Forests (tropical)
  3:  "forest",   // Deciduous Needleleaf Forests
  4:  "forest",   // Deciduous Broadleaf Forests
  5:  "forest",   // Mixed Forests
  6:  "shrub",    // Closed Shrublands
  7:  "shrub",    // Open Shrublands
  8:  "shrub",    // Woody Savannas
  9:  "grass",    // Savannas
  10: "grass",    // Grasslands
  11: "forest",   // Permanent Wetlands (mangrove-friendly)
  12: "crop",     // Croplands
  13: "urban",    // Urban and Built-up Lands
  14: "crop",     // Cropland/Natural Vegetation Mosaics
  15: "barren",   // Permanent Snow and Ice
  16: "barren",   // Barren
  17: "water",    // Water Bodies
};

// Project type → expected land cover categories (most → least compatible)
const LC_EXPECTED: Record<ProjectInput["projectType"], Array<keyof typeof LC_CATEGORY extends string ? never : string>> = {
  forest:   ["forest", "shrub"],
  mangrove: ["forest", "water"],   // coastal wetland
  solar:    ["barren", "grass", "shrub", "crop"],
  biogas:   ["crop", "grass"],
};

// ── Types ─────────────────────────────────────────────────────────────────────

type WeatherData = {
  temperature: number;
  humidity:    number;
  cloudCover:  number;
  windSpeed:   number;
};

type NasaData = {
  solarIrradiance: number;
  precipitation:   number;
  temperature:     number;
};

type NdviData = {
  ndvi:            number;   // –1 to 1
  pixelReliability: number;  // 0=good, 1=marginal, 2=snow/ice, 3=cloudy
};

type LandCoverData = {
  lcType:      number;   // IGBP class 1–17
  assessmentConfidence: number; // 0–100 — satellite classification confidence
};

export type RealSignals = {
  userInputConfidence:  number;
  iotConfidence:        number;
  governmentConfidence: number;
  historicalConfidence: number;
  anomalyScore:         number;
  additionalityScore:   number;
  weather_temperature:  number;
  weather_humidity:     number;
  weather_cloudCover:   number;
  nasa_solarIrradiance: number;
  nasa_precipitation:   number;
  ndvi:                 number | null;
  landCoverType:        number | null;
  dataSource:           "real" | "fallback";
};

// ── In-memory caches ──────────────────────────────────────────────────────────

const weatherCache   = new Map<string, { data: WeatherData;    expiresAt: number }>();
const nasaCache      = new Map<string, { data: NasaData;       expiresAt: number }>();
const ndviCache      = new Map<string, { data: NdviData;       expiresAt: number }>();
const landCoverCache = new Map<string, { data: LandCoverData;  expiresAt: number }>();

// ── API fetchers ──────────────────────────────────────────────────────────────

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
  weatherCache.set(province, { data, expiresAt: Date.now() + 10 * 60_000 });
  console.log(`[weather]    ${province}: ${data.temperature}°C, ${data.humidity}% RH, ${data.cloudCover}% cloud`);
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

  const json = (await res.json()) as { properties: { parameter: Record<string, Record<string, number>> } };
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
  nasaCache.set(province, { data, expiresAt: Date.now() + 24 * 3_600_000 });
  console.log(`[nasa-power] ${province}: solar=${data.solarIrradiance.toFixed(2)} W/m², precip=${data.precipitation.toFixed(2)} mm/day`);
  return data;
}

// MODIS MOD13Q1 — 250m NDVI, 16-day composite
// Uses mid-year (DOY 177) to capture peak growing season in Thailand
async function fetchNDVI(province: string): Promise<NdviData> {
  const cached = ndviCache.get(province);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const { lat, lon } = PROVINCE_COORDS[province] ?? DEFAULT_COORDS;
  const url = `${MODIS_URL}/MOD13Q1/subset?latitude=${lat}&longitude=${lon}&startDate=A2023177&endDate=A2023177&kmAboveBelow=0&kmLeftRight=0`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`MODIS NDVI HTTP ${res.status}`);

  const json = (await res.json()) as { subset: Array<{ band: string; data: number[] }> };
  const bands = Object.fromEntries(json.subset.map(s => [s.band, s.data[0]]));

  const rawNdvi = bands["250m_16_days_NDVI"];
  const rawRel  = bands["250m_16_days_pixel_reliability"];
  if (typeof rawNdvi !== "number") throw new Error("NDVI band missing");

  const data: NdviData = {
    ndvi:            rawNdvi / 10_000,   // scale: –1 to 1
    pixelReliability: rawRel ?? 3,
  };
  ndviCache.set(province, { data, expiresAt: Date.now() + 24 * 3_600_000 });
  console.log(`[modis-ndvi] ${province}: NDVI=${data.ndvi.toFixed(3)}, reliability=${data.pixelReliability}`);
  return data;
}

// MODIS MCD12Q1 — 500m Land Cover (IGBP), annual
// Cross-validates whether the ground at the project's location matches the claimed project type
async function fetchLandCover(province: string): Promise<LandCoverData> {
  const cached = landCoverCache.get(province);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const { lat, lon } = PROVINCE_COORDS[province] ?? DEFAULT_COORDS;
  const url = `${MODIS_URL}/MCD12Q1/subset?latitude=${lat}&longitude=${lon}&startDate=A2020001&endDate=A2020001&kmAboveBelow=0&kmLeftRight=0`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`MODIS Land Cover HTTP ${res.status}`);

  const json = (await res.json()) as { subset: Array<{ band: string; data: number[] }> };
  const bands = Object.fromEntries(json.subset.map(s => [s.band, s.data[0]]));

  const lcType = bands["LC_Type1"];
  // LC_Prop1_Assessment = satellite classification confidence (0–100)
  const assessmentConf = bands["LC_Prop1_Assessment"] ?? 50;
  if (typeof lcType !== "number") throw new Error("LC_Type1 band missing");

  const data: LandCoverData = { lcType, assessmentConfidence: assessmentConf };
  landCoverCache.set(province, { data, expiresAt: Date.now() + 7 * 24 * 3_600_000 }); // 7 day TTL (changes slowly)
  const catName = LC_CATEGORY[lcType] ?? "unknown";
  console.log(`[modis-lc]   ${province}: LC_Type1=${lcType} (${catName}), confidence=${assessmentConf}%`);
  return data;
}

// ── Signal derivation ─────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(v), min), max);
}

// iotConfidence from NDVI — replaces weather-proxy calculation
// NDVI tells us directly whether the ground is vegetated (for bio projects) or open (for solar)
function iotFromNDVI(type: ProjectInput["projectType"], ndvi: NdviData, scaleFactor: number): number {
  const reliability = ndvi.pixelReliability; // 0=best, 3=worst(cloud)
  const reliabilityPenalty = reliability * 8; // cloud = –24 pts

  switch (type) {
    case "forest":
    case "mangrove": {
      // Dense green vegetation = high confidence → NDVI 0.6+ is healthy forest in Thailand
      const base = clamp(30 + (ndvi.ndvi + 1) * 35 + scaleFactor * 12 - reliabilityPenalty, 20, 92);
      return base;
    }
    case "solar": {
      // Low NDVI = open land → good for solar panels
      const base = clamp(50 - (ndvi.ndvi + 1) * 20 + scaleFactor * 12 - reliabilityPenalty, 20, 92);
      return base;
    }
    case "biogas": {
      // Moderate NDVI = agricultural land
      const mid = Math.abs(ndvi.ndvi - 0.3); // peak at 0.3 (cropland)
      const base = clamp(65 - mid * 40 + scaleFactor * 10 - reliabilityPenalty, 20, 92);
      return base;
    }
  }
}

// iotConfidence fallback using weather (original formula)
function iotFromWeather(type: ProjectInput["projectType"], w: WeatherData, scaleFactor: number): number {
  switch (type) {
    case "forest":
    case "mangrove":
      return clamp(40 + (w.humidity - 50) * 0.5 + (35 - Math.abs(w.temperature - 28)) * 1.2 + scaleFactor * 15, 30, 92);
    case "solar":
      return clamp(30 + (100 - w.cloudCover) * 0.55 - (w.humidity - 50) * 0.1 + scaleFactor * 10, 30, 92);
    case "biogas":
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

// governmentConfidence from MODIS Land Cover cross-validation
// Key insight: if satellite says "urban" but project claims "forest" → low confidence
function governmentFromLandCover(type: ProjectInput["projectType"], lc: LandCoverData): number {
  const actualCategory = LC_CATEGORY[lc.lcType] ?? "barren";
  const expectedCategories = LC_EXPECTED[type];
  const matchIdx = expectedCategories.indexOf(actualCategory as never);

  let matchScore: number;
  if (matchIdx === 0)      matchScore = 90;  // perfect match
  else if (matchIdx === 1) matchScore = 72;  // secondary match
  else if (matchIdx < 0) {
    // No match — how bad is it?
    if (actualCategory === "urban") matchScore = 20;   // worst: city vs forest claim
    else if (actualCategory === "water") matchScore = 35;
    else matchScore = 48;                              // wrong but not impossible
  } else matchScore = 60;

  // Weight by satellite classification confidence (0–100%)
  const qualityWeight = lc.assessmentConfidence / 100;
  return clamp(matchScore * qualityWeight + 15 * (1 - qualityWeight), 15, 90);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function collectSignals(input: ProjectInput): Promise<RealSignals> {
  const scaleFactor = Math.min(input.landAreaRai / 500, 1);

  // Always-available signals (no API needed)
  const userInputConfidence = clamp(
    55 + (input.selfReportedReduction / Math.max(input.requestedCredits, 1)) * 15,
    35, 90
  );
  const anomalyScore = clamp(
    ((input.requestedCredits - input.selfReportedReduction) / Math.max(input.requestedCredits, 1)) * 100 + 35,
    5, 95
  );

  // All 4 API calls run concurrently — each can fail independently
  const [weatherResult, nasaResult, ndviResult, landCoverResult] = await Promise.allSettled([
    fetchWeather(input.province),
    fetchNasaPower(input.province),
    fetchNDVI(input.province),
    fetchLandCover(input.province),
  ]);

  const weather   = weatherResult.status   === "fulfilled" ? weatherResult.value   : null;
  const nasa      = nasaResult.status      === "fulfilled" ? nasaResult.value      : null;
  const ndvi      = ndviResult.status      === "fulfilled" ? ndviResult.value      : null;
  const landCover = landCoverResult.status === "fulfilled" ? landCoverResult.value : null;

  if (!weather)   console.warn(`[dataAggregator] OpenWeatherMap failed: ${(weatherResult as PromiseRejectedResult).reason}`);
  if (!nasa)      console.warn(`[dataAggregator] NASA POWER failed: ${(nasaResult as PromiseRejectedResult).reason}`);
  if (!ndvi)      console.warn(`[dataAggregator] MODIS NDVI failed: ${(ndviResult as PromiseRejectedResult).reason}`);
  if (!landCover) console.warn(`[dataAggregator] MODIS Land Cover failed: ${(landCoverResult as PromiseRejectedResult).reason}`);

  // iotConfidence: prefer NDVI (satellite vegetation index), fall back to weather
  const iotConfidence = ndvi
    ? iotFromNDVI(input.projectType, ndvi, scaleFactor)
    : weather
      ? iotFromWeather(input.projectType, weather, scaleFactor)
      : clamp(40 + scaleFactor * 20, 30, 75);

  // governmentConfidence: prefer MODIS land cover cross-validation, fall back to hardcoded factor
  const governmentConfidence = landCover
    ? governmentFromLandCover(input.projectType, landCover)
    : clamp(48 + scaleFactor * 15, 30, 78); // neutral fallback

  const historicalConfidence = nasa
    ? historicalFromNasa(input.projectType, nasa, scaleFactor)
    : clamp(45 + scaleFactor * 25, 30, 78);

  const additionalityScore = clamp(
    historicalConfidence * 0.4 + iotConfidence * 0.35 + governmentConfidence * 0.25 * 0.5,
    20, 90
  );

  const anyReal = weather || nasa || ndvi || landCover;
  const dataSource: "real" | "fallback" = anyReal ? "real" : "fallback";

  return {
    userInputConfidence,
    iotConfidence,
    governmentConfidence,
    historicalConfidence,
    anomalyScore,
    additionalityScore,
    weather_temperature:  weather ? Math.round(weather.temperature * 10) / 10 : 0,
    weather_humidity:     weather?.humidity ?? 0,
    weather_cloudCover:   weather?.cloudCover ?? 0,
    nasa_solarIrradiance: nasa ? Math.round(nasa.solarIrradiance * 100) / 100 : 0,
    nasa_precipitation:   nasa ? Math.round(nasa.precipitation  * 100) / 100 : 0,
    ndvi:                 ndvi ? Math.round(ndvi.ndvi * 1000) / 1000 : null,
    landCoverType:        landCover?.lcType ?? null,
    dataSource,
  };
}
