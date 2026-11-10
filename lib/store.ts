// Demo-mode in-memory store (no DB needed).
// In production replace with Prisma calls. Cache mimics Redis TTL (60s).

type Row = Record<string, any>;

const mem: Record<string, Row[]> = {
  announcements: [
    { id: "A-1", title: "Stay Safe: Night patrolling increased", message: "Extra patrols in Shivajinagar, Baner 8pm-2am this week.", area: "Shivajinagar", severity: "info", createdAt: new Date().toISOString() },
    { id: "A-2", title: "High risk: Chain snatching spike", message: "Avoid isolated lanes in Hadapsar after 9pm. Report suspicious activity.", area: "Hadapsar", severity: "high", createdAt: new Date().toISOString() },
  ],
  evidence: [],
  reports: [],
  lostFound: [
    { id: "LF-1", kind: "lost", item: "Black wallet", area: "Deccan", description: "Lost near FC road, contains ID card.", imageUrl: "", status: "open", createdAt: new Date().toISOString() },
    { id: "LF-2", kind: "found", item: "iPhone 12 blue case", area: "Viman Nagar", description: "Found near Phoenix mall entrance.", imageUrl: "", status: "open", createdAt: new Date().toISOString() },
  ],
  community: [
    { id: "C-1", text: "Suspicious person near Swargate bus stop late night.", area: "Swargate", likes: 12, createdAt: new Date().toISOString() },
    { id: "C-2", text: "Streetlight not working in Baner lane 5 — feels unsafe.", area: "Baner", likes: 8, createdAt: new Date().toISOString() },
  ],
};

// Simple TTL cache (Redis stand-in for /predict + /crimes)
const cache = new Map<string, { v: any; exp: number }>();
export function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache.delete(key);
    return null;
  }
  return hit.v;
}
export function cacheSet(key: string, v: any, ttlMs = 60_000) {
  cache.set(key, { v, exp: Date.now() + ttlMs });
}

// Call after any write that affects cached reads (new report, FIR upload)
export function cacheInvalidate(prefix: string) {
  for (const k of [...cache.keys()]) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

export const store = {
  list(name: string) {
    return mem[name] ?? [];
  },
  add(name: string, row: Row) {
    mem[name] = mem[name] ?? [];
    mem[name].unshift(row);
    return row;
  },
  likeCommunity(id: string) {
    const r = mem.community.find((x) => x.id === id);
    if (r) r.likes = (r.likes ?? 0) + 1;
    return r;
  },
};
