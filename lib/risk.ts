import type { Crime } from "./crime-data";

/**
 * Mock ML risk scorer (explainable, fast).
 * Factors: frequency (40%) + recency (25%) + severity (20%) + night-time pattern (15%)
 * Returns 0-100 score + label + contributing factors.
 */
export function scoreArea(area: string, crimes: Crime[]) {
  const now = Date.now();
  const inArea = crimes.filter((c) => c.area === area);
  const total = inArea.length;
  if (total === 0)
    return { area, score: 5, label: "Low" as const, total: 0, factors: { frequency: 0, recency: 0, severity: 0, night: 0 }, recommendation: "Routine patrolling sufficient." };

  const freq = Math.min(40, (total / 60) * 40);
  const recent = inArea.filter((c) => now - new Date(c.datetime).getTime() < 30 * 864e5).length;
  const recency = Math.min(25, (recent / 20) * 25);
  const sevW = inArea.reduce((s, c) => s + (c.severity === "high" ? 3 : c.severity === "medium" ? 2 : 1), 0);
  const severity = Math.min(20, (sevW / 60) * 20);
  const night = inArea.filter((c) => {
    const h = new Date(c.datetime).getHours();
    return h >= 20 || h <= 5;
  }).length;
  const nightScore = Math.min(15, (night / Math.max(1, total)) * 15);

  const score = Math.round(Math.min(98, freq + recency + severity + nightScore + 8));
  const label = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const recommendation =
    label === "High"
      ? "Deploy 2 extra patrol units 8pm–2am. Enable citizen alerts for this area."
      : label === "Medium"
        ? "Increase night checkpoints on weekends. Review CCTV coverage."
        : "Routine patrolling sufficient.";

  return {
    area,
    score,
    label: label as "High" | "Medium" | "Low",
    total,
    recent30: recent,
    factors: {
      frequency: Math.round(freq),
      recency: Math.round(recency),
      severity: Math.round(severity),
      night: Math.round(nightScore),
    },
    recommendation,
    next7Days: Math.min(98, score + Math.round(Math.random() * 6 - 2)),
  };
}

export function scoreAllAreas(crimes: Crime[]) {
  const areas = Array.from(new Set(crimes.map((c) => c.area)));
  return areas.map((a) => scoreArea(a, crimes)).sort((x, y) => y.score - x.score);
}
