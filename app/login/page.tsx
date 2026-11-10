"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, type Role } from "@/lib/auth-context";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("officer@demo.com");
  const [password, setPassword] = useState("demo123");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("OFFICER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (userRole: string) => router.push(userRole === "OFFICER" ? "/officer" : "/citizen");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res =
      mode === "login"
        ? await login(email, password)
        : await register(email, password, name || email.split("@")[0], role);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed");
      return;
    }
    // fetch fresh session to route by role
    const s = await fetch("/api/auth/session").then((r) => r.json());
    go(s.user.role);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-navy-950 px-4">
      <form onSubmit={submit} className="card w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500"><ShieldCheck className="text-white" /></div>
          <div>
            <h1 className="text-xl font-extrabold">{mode === "login" ? "Secure Login" : "Create Account"}</h1>
            <p className="text-xs text-slate-400">Real accounts • stored in database</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
          {(["OFFICER", "CITIZEN"] as Role[]).map((r) => (
            <button type="button" key={r} onClick={() => { setRole(r); setEmail(r === "OFFICER" ? "officer@demo.com" : "citizen@demo.com"); }}
              className={`rounded-lg py-2 text-sm font-bold ${role === r ? "bg-brand-500 text-white" : "text-slate-300"}`}>
              {r === "OFFICER" ? "👮 Officer" : "🧑 Citizen"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <>
            <label className="label mt-4">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </>
        )}
        <label className="label mt-4">Email</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label className="label mt-4">Password {mode === "register" && "(min 6 chars)"}</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />

        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}

        <button disabled={busy} className="btn-primary mt-6 w-full disabled:opacity-50">
          {busy ? "Please wait…" : mode === "login" ? `Login as ${role}` : "Register"}
        </button>
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-2 w-full text-center text-xs text-blue-300 hover:underline">
          {mode === "login" ? "New here? Create an account" : "Have an account? Login"}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">
          Seeded: officer@demo.com / citizen@demo.com / priya@demo.com (demo123)
        </p>
        <Link href="/" className="mt-4 block text-center text-xs text-blue-300 hover:underline">← Back to home</Link>
      </form>
    </main>
  );
}
