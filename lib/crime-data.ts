export type Crime = {
  id: string;
  type: string;
  area: string;
  latitude: number;
  longitude: number;
  datetime: string;
  description: string;
  status: string;
  severity: "high" | "medium" | "low";
};

// Loaded from JSON at runtime (works in server + client).
// For performance: paginate + filter server-side in /api/crimes.
import raw from "./data/pune-crimes.json";

export const ALL_CRIMES: Crime[] = raw as Crime[];

export const AREAS = Array.from(new Set(ALL_CRIMES.map((c) => c.area))).sort();
export const CRIME_TYPES = Array.from(new Set(ALL_CRIMES.map((c) => c.type))).sort();

export function filterCrimes(opts: {
  area?: string;
  type?: string;
  q?: string;
  from?: string;
  to?: string;
}) {
  let out = ALL_CRIMES;
  if (opts.area && opts.area !== "All") out = out.filter((c) => c.area === opts.area);
  if (opts.type && opts.type !== "All") out = out.filter((c) => c.type === opts.type);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    out = out.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.area.toLowerCase().includes(q)
    );
  }
  if (opts.from) out = out.filter((c) => c.datetime >= opts.from!);
  if (opts.to) out = out.filter((c) => c.datetime <= opts.to!);
  return out.sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
}
