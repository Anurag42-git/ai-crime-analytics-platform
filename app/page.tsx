"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { ShieldCheck, MapPin, BellRing, FileUp, Users, BrainCircuit } from "lucide-react";
import { useEffect, useState } from "react";

const PreviewMap = dynamic(() => import("@/components/PreviewMap"), { ssr: false });

export default function Landing() {
  const [stats, setStats] = useState({ total: 650, high: 0, acc: 87 });
  useEffect(() => {
    fetch("/api/predict/risk")
      .then((r) => r.json())
      .then((d) => {
        if (d?.areas) setStats((s) => ({ ...s, high: d.areas.filter((a: any) => a.label === "High").length }));
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-[#070D24]">
      {/* NAV */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold leading-tight">AI Crime Analytics</p>
            <p className="text-xs text-slate-400">Smart Cities • Pune</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-ghost text-sm">Login</Link>
          <Link href="/login" className="btn-primary text-sm">Open Dashboard</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-10 pt-10 lg:grid-cols-2 lg:items-center">
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300">
              ML • AI • DATA ANALYTICS • CLOUD • MOBILE-READY
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] lg:text-6xl">
              Intelligent Crime Prediction <span className="bg-gradient-to-r from-blue-400 to-amber-300 bg-clip-text text-transparent">& Analytics</span>
            </h1>
            <p className="mt-5 max-w-xl text-slate-300">
              Analyzes historical + real-time FIR data to identify hotspots, predict high-risk areas,
              generate analytical dashboards and real-time alerts — reducing manual effort and optimizing patrol planning.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/officer" className="btn-primary">Officer Dashboard</Link>
              <Link href="/citizen" className="btn-ghost">Citizen Portal</Link>
            </div>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-4">
              {[
                { k: `${stats.total}+`, v: "Crimes analyzed" },
                { k: `${stats.high}`, v: "High-risk zones" },
                { k: `${stats.acc}%`, v: "Prediction accuracy*" },
              ].map((s) => (
                <div key={s.v} className="card text-center">
                  <p className="text-2xl font-extrabold text-white">{s.k}</p>
                  <p className="text-xs text-slate-400">{s.v}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">* rule-based demo model. Replace with trained ML in production.</p>
          </motion.div>
        </div>
        <div className="card overflow-hidden p-2">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold">Live Hotspot Preview — Pune</p>
            <span className="flex items-center gap-1 text-xs text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> live</span>
          </div>
          <PreviewMap />
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: BrainCircuit, t: "Risk Prediction", d: "Area risk score 0-100 + 7-day forecast" },
            { icon: MapPin, t: "Hotspot Maps", d: "Cluster + heatmap, filters, patrol routes" },
            { icon: FileUp, t: "FIR Ingest", d: "Excel/CSV upload, validate & store" },
            { icon: BellRing, t: "Real-time Alerts", d: "Officer broadcasts to citizens" },
            { icon: Users, t: "Citizen Reports", d: "Crime, evidence, community posts" },
            { icon: ShieldCheck, t: "Role Access", d: "Officer / Citizen secure access" },
          ].map((f) => (
            <div key={f.t} className="card">
              <f.icon className="h-6 w-6 text-blue-400" />
              <p className="mt-3 font-bold text-sm">{f.t}</p>
              <p className="mt-1 text-xs text-slate-400">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-center md:flex-row md:text-left">
          <div>
            <p className="font-bold">Demo logins — no setup needed</p>
            <p className="text-sm text-slate-300">Officer: officer@demo.com • Citizen: citizen@demo.com (any password)</p>
          </div>
          <Link href="/login" className="btn-primary">Try now</Link>
        </div>
      </section>
    </main>
  );
}
