"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth-context";
import { TrendChart, TypeDonut, HourlyHeat } from "@/components/Charts";
import { Siren, FileText, MapPin, Megaphone, FolderLock, Upload, Route } from "lucide-react";

const CrimeMap = dynamic(() => import("@/components/CrimeMap"), { ssr: false });

const TABS = [
  { id: "overview", label: "Overview", icon: Siren },
  { id: "map", label: "Hotspot & Prediction", icon: MapPin },
  { id: "ingest", label: "FIR Ingest", icon: Upload },
  { id: "fir", label: "FIR Records", icon: FileText },
  { id: "evidence", label: "Evidence Vault", icon: FolderLock },
  { id: "announce", label: "Announcements", icon: Megaphone },
  { id: "patrol", label: "Patrol Planning", icon: Route },
];

export default function OfficerPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && (!session || session.role !== "OFFICER")) router.push("/login");
  }, [loading, session, router]);
  const [tab, setTab] = useState("overview");
  const [crimes, setCrimes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [areas, setAreas] = useState<any[]>([]);
  const [selArea, setSelArea] = useState<string>("");
  const [areaScore, setAreaScore] = useState<any>(null);
  const [filter, setFilter] = useState({ area: "All", type: "All", q: "" });
  const [uploadRes, setUploadRes] = useState<any>(null);
  const [ann, setAnn] = useState<any[]>([]);
  const [annForm, setAnnForm] = useState({ title: "", message: "", area: "Shivajinagar", severity: "info" });
  const [evForm, setEvForm] = useState({ crimeId: "", tags: "", fileUrl: "" });

  useEffect(() => {
    const p = new URLSearchParams({ limit: "400", ...(filter.area !== "All" ? { area: filter.area } : {}), ...(filter.type !== "All" ? { type: filter.type } : {}), ...(filter.q ? { q: filter.q } : {}) });
    fetch(`/api/crimes?${p}`).then((r) => r.json()).then((d) => { setCrimes(d.data ?? []); setTotal(d.total ?? 0); }).catch(() => {});
    fetch("/api/predict/risk").then((r) => r.json()).then((d) => setAreas(d.areas ?? [])).catch(() => {});
    fetch("/api/announcements").then((r) => r.json()).then((d) => setAnn(d.data ?? [])).catch(() => {});
  }, [filter.area, filter.type]);

  useEffect(() => {
    if (!selArea) return;
    fetch(`/api/predict/risk?area=${encodeURIComponent(selArea)}`).then((r) => r.json()).then((d) => setAreaScore(d.areas?.[0])).catch(() => {});
  }, [selArea]);

  const trend = useMemo(() => {
    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
    return months.map((m, i) => ({ month: m, count: 60 + Math.round(Math.random() * 60) + i * 8 }));
  }, []);
  const donut = useMemo(() => {
    const m = new Map<string, number>();
    crimes.forEach((c) => m.set(c.type, (m.get(c.type) ?? 0) + 1));
    return [...m.entries()].slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [crimes]);
  const hourly = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    crimes.forEach((c) => { try { h[new Date(c.datetime).getHours()].count++; } catch {} });
    return h;
  }, [crimes]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const res = await fetch("/api/fir/upload", { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
    setUploadRes(await res.json());
  };

  const postAnnouncement = async () => {
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(annForm) });
    const d = await res.json();
    if (d.ok) { setAnn([d.data, ...ann]); setAnnForm({ title: "", message: "", area: "Shivajinagar", severity: "info" }); }
  };

  const postEvidence = async () => {
    await fetch("/api/evidence", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crimeId: evForm.crimeId, tags: evForm.tags.split(",").map((t) => t.trim()), fileUrl: evForm.fileUrl || "demo-upload" }) });
    setEvForm({ crimeId: "", tags: "", fileUrl: "" });
    alert("Evidence logged (demo). Connect S3 + Postgres for file storage.");
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <Topbar title="Officer Dashboard" subtitle="Crime intelligence • Pune Police (demo)" />
      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-6">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col gap-1 lg:flex">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${tab === t.id ? "bg-brand-500 text-white shadow-lg" : "text-slate-300 hover:bg-white/5"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <div className="card mt-4">
            <p className="text-xs font-bold text-amber-300">PATROL TIP</p>
            <p className="mt-1 text-xs text-slate-300">{areas[0] ? `${areas[0].area} is highest risk (${areas[0].score}). Prioritize 8pm–2am.` : "Loading risk…"}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${tab === t.id ? "bg-brand-500 text-white" : "bg-white/5 text-slate-300"}`}>{t.label}</button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { k: "Total Crimes", v: total || 650 },
                  { k: "FIRs this month", v: Math.round((total || 650) / 6) },
                  { k: "High-risk zones", v: areas.filter((a) => a.label === "High").length },
                  { k: "Model accuracy*", v: "87%" },
                ].map((s) => (
                  <div key={s.k} className="card"><p className="text-3xl font-extrabold">{s.v}</p><p className="text-xs text-slate-400">{s.k}</p></div>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="card"><p className="mb-3 font-bold">Crime Trend (6 months)</p><TrendChart data={trend} /></div>
                <div className="card"><p className="mb-3 font-bold">Crime by Type</p><TypeDonut data={donut.length ? donut : [{ name: "Theft", value: 1 }]} />
                  <div className="mt-2 flex flex-wrap gap-2">{donut.map((d) => <span key={d.name} className="rounded bg-white/5 px-2 py-1 text-[11px]">{d.name}: {d.value}</span>)}</div>
                </div>
              </div>
              <div className="card"><p className="mb-3 font-bold">Hourly Pattern (when crimes peak)</p><HourlyHeat data={hourly} /></div>
              <div className="card">
                <p className="mb-3 font-bold">Top 5 Hotspots</p>
                <div className="space-y-2">
                  {areas.slice(0, 5).map((a, i) => (
                    <div key={a.area} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <span className="text-sm font-semibold">#{i + 1} {a.area} <span className="text-slate-400">• {a.total} cases</span></span>
                      <span className={a.label === "High" ? "badge-high" : a.label === "Medium" ? "badge-medium" : "badge-low"}>{a.score} • {a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "map" && (
            <div className="space-y-4">
              <div className="card flex flex-wrap items-end gap-3">
                <div><label className="label">Area</label>
                  <select className="input" value={filter.area} onChange={(e) => setFilter({ ...filter, area: e.target.value })}>
                    <option>All</option>{areas.map((a) => <option key={a.area}>{a.area}</option>)}
                  </select></div>
                <div><label className="label">Crime type</label>
                  <select className="input" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
                    <option>All</option><option>Theft</option><option>Robbery</option><option>Assault</option><option>Burglary</option><option>Fraud</option><option>Cybercrime</option>
                  </select></div>
                <div className="flex-1"><label className="label">Search</label>
                  <input className="input" placeholder="CR-0001, area…" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} /></div>
                <p className="w-full text-xs text-slate-400">Click any dot on map to score that area. Showing {crimes.length} of {total}.</p>
              </div>
              <CrimeMap crimes={crimes} onSelect={setSelArea} />
              {(areaScore || selArea) && (
                <div className="card border-amber-400/20">
                  <p className="font-bold">Risk Score: {areaScore?.area ?? selArea} — <span className="text-2xl">{areaScore?.score ?? "…"}/100</span></p>
                  {areaScore && (
                    <div className="mt-2 text-sm text-slate-300">
                      <p>Label: <b>{areaScore.label}</b> • Next 7 days forecast: <b>{areaScore.next7Days}</b></p>
                      <p className="mt-1">Factors — frequency {areaScore.factors.frequency}, recency {areaScore.factors.recency}, severity {areaScore.factors.severity}, night {areaScore.factors.night}</p>
                      <p className="mt-1 text-amber-200">Recommendation: {areaScore.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "ingest" && (
            <div className="card space-y-4">
              <h2 className="text-lg font-extrabold">Report FIR / Crime Excel → Analyze & Store</h2>
              <p className="text-sm text-slate-400">Upload CSV export of Excel (columns: type, area, datetime, description). Validated server-side at <code>/api/fir/upload</code>.</p>
              <input type="file" accept=".csv,.txt" onChange={handleUpload} className="input" />
              {uploadRes && (
                <pre className="overflow-auto rounded-xl bg-black/40 p-4 text-xs">{JSON.stringify(uploadRes, null, 2)}</pre>
              )}
              <p className="text-xs text-slate-500">Sample header: <code>type,area,datetime,description</code></p>
            </div>
          )}

          {tab === "fir" && (
            <div className="card">
              <p className="mb-3 font-bold">FIR Records ({total})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-slate-400"><th className="p-2">ID</th><th className="p-2">Type</th><th className="p-2">Area</th><th className="p-2">Date</th><th className="p-2">Status</th></tr></thead>
                  <tbody>{crimes.slice(0, 30).map((c) => (
                    <tr key={c.id} className="border-t border-white/5"><td className="p-2 font-mono">{c.id}</td><td className="p-2">{c.type}</td><td className="p-2">{c.area}</td><td className="p-2 text-xs">{new Date(c.datetime).toLocaleDateString()}</td><td className="p-2"><span className="rounded bg-white/10 px-2 py-0.5 text-xs">{c.status}</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "evidence" && (
            <div className="card space-y-3">
              <h2 className="font-extrabold">Evidence Vault (secure, FIR-linked)</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <input className="input" placeholder="Crime ID e.g. CR-0001" value={evForm.crimeId} onChange={(e) => setEvForm({ ...evForm, crimeId: e.target.value })} />
                <input className="input" placeholder="tags: cctv, witness" value={evForm.tags} onChange={(e) => setEvForm({ ...evForm, tags: e.target.value })} />
                <input className="input" placeholder="file URL / demo" value={evForm.fileUrl} onChange={(e) => setEvForm({ ...evForm, fileUrl: e.target.value })} />
              </div>
              <button onClick={postEvidence} className="btn-primary text-sm">Log Evidence</button>
              <p className="text-xs text-slate-400">Production: store files in S3/Cloudinary, restrict by role, hash + audit log.</p>
            </div>
          )}

          {tab === "announce" && (
            <div className="space-y-4">
              <div className="card space-y-3">
                <h2 className="font-extrabold">Make Announcement — “Stay Safe” / “Increasing Risk”</h2>
                <input className="input" placeholder="Title" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} />
                <textarea className="input" rows={3} placeholder="Message for citizens in area…" value={annForm.message} onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <select className="input" value={annForm.area} onChange={(e) => setAnnForm({ ...annForm, area: e.target.value })}>
                    {areas.map((a) => <option key={a.area}>{a.area}</option>)}
                  </select>
                  <select className="input" value={annForm.severity} onChange={(e) => setAnnForm({ ...annForm, severity: e.target.value })}>
                    <option value="info">info</option><option value="warning">warning</option><option value="high">high</option>
                  </select>
                </div>
                <button onClick={postAnnouncement} className="btn-primary text-sm">Broadcast</button>
              </div>
              {ann.map((a) => (
                <div key={a.id} className="card"><p className="font-bold">{a.title}</p><p className="text-sm text-slate-300">{a.message}</p><p className="mt-1 text-xs text-slate-500">{a.area} • {a.severity}</p></div>
              ))}
            </div>
          )}

          {tab === "patrol" && (
            <div className="card space-y-2">
              <h2 className="font-extrabold">Auto Patrol Plan (from risk scores)</h2>
              {areas.slice(0, 5).map((a, i) => (
                <div key={a.area} className="rounded-xl bg-white/5 p-3 text-sm">
                  <b>Route {i + 1}:</b> {a.area} → adjacent sectors • <b>{a.score}/100 ({a.label})</b><br />
                  <span className="text-slate-400">{a.recommendation}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
