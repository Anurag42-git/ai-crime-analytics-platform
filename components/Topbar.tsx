"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, BellRing, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { session, logout } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/announcements").then((r) => r.json()).then((d) => setAlerts(d.data ?? [])).catch(() => {});
  }, []);
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500"><ShieldCheck className="h-5 w-5 text-white" /></div>
          <div>
            <p className="text-sm font-extrabold leading-none">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm sm:flex" title="Live announcements">
            <BellRing className="h-4 w-4 text-amber-300" />
            <span className="text-xs text-slate-300">{alerts.length} active alerts</span>
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold">{alerts.length}</span>
          </div>
          <span className="hidden rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 md:block">
            {session ? `${session.email} • ${session.role}` : "Guest — demo mode"}
          </span>
          {session ? (
            <button onClick={() => { logout(); window.location.href = "/"; }} className="btn-ghost !px-3 !py-2 text-xs"><LogOut className="h-4 w-4" /> Logout</button>
          ) : (
            <Link href="/login" className="btn-primary !px-4 !py-2 text-xs">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
