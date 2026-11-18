import type { Crime } from "./crime-data";

/**
 * Explainable area-risk scorer (rule-based ML stand-in).
 *
 * Four factors, each normalised against the worst area in the current dataset:
 *   frequency 40%  — how many FIRs the area has
 *   recency   25%  — how many of those are in the last 30 days
 *   severity  20%  — weighted by high=3 / medium=2 / low=1
 *   night     15%  — share of incidents between 20:00 and 05:59
 *
 * Normalising against the dataset max (instead of fixed caps) keeps the 0–100
 * scale meaningful as the number of FIRs grows. With fixed caps, a full-size
 * dataset saturates every area at 98/High.
 *
 * Returns 0–100 score + label + contributing factors + patrol recommendation.
 */

type AreaStats = {
  area: string;
  total: number;
  recent30: number;
  sevWeight: number;
  night: number;
  nightShare: number;
};

type Maxima = {
  total: number;
  recent30: number;
  sevWeight: number;
  nightShare: number;
};

const THIRTY_DAYS = 30 * 864e5;

function rawStats(area: string, crimes: Crime[]): AreaStats | null {
  const inArea = crimes.filter((c) => c.area === area);
  const total = inArea.length;
  if (total === 0) return null;

  const now = Date.now();
  const recent30 = inArea.filter((c) => now - new Date(c.datetime).getTime() < THIRTY_DAYS).length;
  const sevWeight = inArea.reduce(
    (s, c) => s + (c.severity === "high" ? 3 : c.severity === "medium" ? 2 : 1),
    0
  );
  const night = inArea.filter((c) => {
    const h = new Date(c.datetime).getHours();
    return h >= 20 || h <= 5;
  }).length;

  return { area, total, recent30, sevWeight, night, nightShare: night / total };
}

function maxima(stats: AreaStats[]): Maxima {
  return {
    total: Math.max(1, ...stats.map((s) => s.total)),
    recent30: Math.max(1, ...stats.map((s) => s.recent30)),
    sevWeight: Math.max(1, ...stats.map((s) => s.sevWeight)),
    nightShare: Math.max(1, ...stats.map((s) => s.nightShare)),
  };
}

function buildScore(s: AreaStats, max: Maxima) {
  const frequency = (s.total / max.total) * 40;
  const recency = (s.recent30 / max.recent30) * 25;
  const severity = (s.sevWeight / max.sevWeight) * 20;
  const night = (s.nightShare / max.nightShare) * 15;

  const score = Math.round(Math.min(98, frequency + recency + severity + night));
  const label = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const recommendation =
    label === "High"
      ? "Deploy 2 extra patrol units 8pm–2am. Enable citizen alerts for this area."
      : label === "Medium"
        ? "Increase night checkpoints on weekends. Review CCTV coverage."
        : "Routine patrolling sufficient.";

  return {
    area: s.area,
    score,
    label: label as "High" | "Medium" | "Low",
    total: s.total,
    recent30: s.recent30,
    factors: {
      frequency: Math.round(frequency),
      recency: Math.round(recency),
      severity: Math.round(severity),
      night: Math.round(night),
    },
    recommendation,
    // Directional placeholder for the 7-day forecast (a trained model replaces this).
    next7Days: Math.max(1, Math.min(98, score + Math.round(Math.random() * 6 - 2))),
  };
}

export function scoreArea(area: string, crimes: Crime[]) {
  const all = Array.from(new Set(crimes.map((c) => c.area)))
    .map((a) => rawStats(a, crimes))
    .filter((s): s is AreaStats => s !== null);

  const target = all.find((s) => s.area === area);
  if (!target)
    return {
      area,
      score: 5,
      label: "Low" as const,
      total: 0,
      factors: { frequency: 0, recency: 0, severity: 0, night: 0 },
      recommendation: "Routine patrolling sufficient.",
      next7Days: 5,
    };

  return buildScore(target, maxima(all));
}

export function scoreAllAreas(crimes: Crime[]) {
  const all = Array.from(new Set(crimes.map((c) => c.area)))
    .map((a) => rawStats(a, crimes))
    .filter((s): s is AreaStats => s !== null);

  const max = maxima(all);
  return all.map((s) => buildScore(s, max)).sort((x, y) => y.score - x.score);
}
