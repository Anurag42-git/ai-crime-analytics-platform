"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, BellRing, LogOut, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { session, logout } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadAlerts = useCallback(() => {
    fetch("/api/announcements", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAlerts(d.data ?? []))
      .catch(() => {});
  }, []);

  // Initial load + keep the badge fresh so new broadcasts appear without a refresh.
  useEffect(() => {
    loadAlerts();
    const t = setInterval(loadAlerts, 30_000);
    return () => clearInterval(t);
  }, [loadAlerts]);

  // Close the panel on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const togglePanel = () => {
    setOpen((v) => !v);
    if (!open) loadAlerts();
  };

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
          <div ref={boxRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={togglePanel}
              aria-expanded={open}
              aria-haspopup="true"
              aria-label={`Active alerts (${alerts.length})`}
              className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <BellRing className="h-4 w-4 text-amber-300" />
              <span className="text-xs text-slate-300">{alerts.length} active alerts</span>
              {alerts.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold">
                  {alerts.length}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-navy-950 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Officer alerts</p>
                  <button onClick={() => setOpen(false)} aria-label="Close alerts" className="text-slate-400 transition hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-auto">
                  {alerts.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-400">No active alerts.</p>
                  ) : (
                    alerts.map((a) => (
                      <div key={a.id} className="border-b border-white/5 px-4 py-3 last:border-0">
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              a.severity === "high" ? "bg-red-400" : a.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug">{a.title}</p>
                            <p className="mt-0.5 text-xs text-slate-300">{a.message}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {a.area} •{" "}
                              {new Date(a.createdAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">
                  Official broadcasts from officers • updates every 30s
                </div>
              </div>
            )}
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
