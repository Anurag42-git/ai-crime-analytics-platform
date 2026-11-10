"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, Megaphone, PackageSearch, MessagesSquare, FileWarning } from "lucide-react";

export default function CitizenPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [loading, session, router]);

  const [areas, setAreas] = useState<any[]>([]);
  const [selArea, setSelArea] = useState("Baner");
  const [score, setScore] = useState<any>(null);
  const [feed, setFeed] = useState<{ announcements: any[]; community: any[] }>({ announcements: [], community: [] });
  const [post, setPost] = useState({ text: "", area: "Baner" });
  const [report, setReport] = useState({ type: "Theft", area: "Baner", description: "", anonymous: false });
  const [lf, setLf] = useState<any[]>([]);
  const [lfForm, setLfForm] = useState({ kind: "lost", item: "", area: "Baner", description: "" });
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(() => {
    fetch("/api/predict/risk").then((r) => r.json()).then((d) => setAreas(d.areas ?? [])).catch(() => {});
    fetch("/api/alerts").then((r) => r.json()).then(setFeed).catch(() => {});
    fetch("/api/lost-found").then((r) => r.json()).then((d) => setLf(d.data ?? [])).catch(() => {});
    fetch("/api/claims?view=mine").then((r) => r.json()).then((d) => setMyClaims(d.data ?? [])).catch(() => {});
    fetch("/api/claims?view=incoming").then((r) => r.json()).then((d) => setIncoming(d.data ?? [])).catch(() => {});
    fetch("/api/chat/conversations").then((r) => r.json()).then((d) => setConvs(d.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [session, loadAll]);

  useEffect(() => {
    fetch(`/api/predict/risk?area=${encodeURIComponent(selArea)}`).then((r) => r.json()).then((d) => setScore(d.areas?.[0])).catch(() => {});
  }, [selArea]);

  // Poll active conversation every 2s — both citizens see messages live
  useEffect(() => {
    if (!activeConv) return;
    let stop = false;
    const poll = () =>
      fetch(`/api/chat/messages?conversationId=${activeConv}`)
        .then((r) => r.json())
        .then((d) => {
          if (!stop) {
            setMsgs(d.data ?? []);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
        })
        .catch(() => {});
    poll();
    const t = setInterval(poll, 2000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [activeConv]);

  // Poll conversations + claims so approvals appear without refresh
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => {
      fetch("/api/claims?view=mine").then((r) => r.json()).then((d) => setMyClaims(d.data ?? [])).catch(() => {});
      fetch("/api/claims?view=incoming").then((r) => r.json()).then((d) => setIncoming(d.data ?? [])).catch(() => {});
      fetch("/api/chat/conversations").then((r) => r.json()).then((d) => setConvs(d.data ?? [])).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [session]);

  const submitPost = async () => {
    if (!post.text.trim()) return;
    const r = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(post) });
    const d = await r.json();
    if (d.ok) { setFeed({ ...feed, community: [d.data, ...feed.community] }); setPost({ text: "", area: post.area }); }
    else setNotice(d.error ?? "Failed to post");
  };

  const submitReport = async () => {
    const r = await fetch("/api/crimes", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: report.type, area: report.area, description: report.description, anonymous: report.anonymous }) });
    const d = await r.json();
    if (d.ok) {
      setNotice(report.anonymous ? "Anonymous report filed. Officers and nearby citizens can see it." : "Report filed — officers will review it.");
      setReport({ ...report, description: "" });
    } else setNotice(d.error ?? "Failed to file report");
  };

  const submitLF = async () => {
    const r = await fetch("/api/lost-found", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lfForm) });
    const d = await r.json();
    if (d.ok) { loadAll(); setLfForm({ kind: "lost", item: "", area: lfForm.area, description: "" }); }
    else setNotice(d.error ?? "Failed to post");
  };

  const claimItem = async (id: string) => {
    const msg = prompt("Describe the item to prove it is yours (sent to the owner):") ?? "";
    const r = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lostFoundId: id, message: msg }) });
    const d = await r.json();
    setNotice(d.ok ? "Claim sent! The owner will approve — chat opens on approval." : (d.error ?? "Claim failed"));
    if (d.ok) loadAll();
  };

  const decide = async (claimId: string, action: "approve" | "reject") => {
    const r = await fetch(`/api/claims/${claimId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await r.json();
    if (d.ok) {
      setNotice(action === "approve" ? "Approved — private chat is now open below." : "Claim rejected.");
      loadAll();
      if (action === "approve" && d.conversation) setActiveConv(d.conversation.id);
    } else setNotice(d.error ?? "Failed");
  };

  const sendMsg = async () => {
    if (!chatInput.trim() || !activeConv) return;
    const r = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConv, text: chatInput }) });
    const d = await r.json();
    if (d.ok) {
      setMsgs([...msgs, d.data]);
      setChatInput("");
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-navy-950 text-slate-300">Loading…</div>;
  if (!session) return null;

  const safety = score ? 100 - score.score : 70;
  const claimFor = (postId: string) => myClaims.find((c) => c.lostFound.id === postId);
  const mineConvFor = (postId: string) => {
    const c = claimFor(postId);
    return c?.status === "approved" ? c.conversation?.id : null;
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <Topbar title="Citizen Portal" subtitle={`Safety • reports • lost & found — ${session.name}`} />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {notice && (
          <div className="card border-emerald-400/30 bg-emerald-400/10 text-sm text-emerald-200">
            {notice} <button onClick={() => setNotice("")} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {/* Safety score */}
        <div className="card flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="flex items-center gap-2 font-extrabold"><ShieldCheck className="h-5 w-5 text-emerald-300" /> Home Safety Score</p>
            <div className="mt-3 flex gap-2">
              <select className="input max-w-xs" value={selArea} onChange={(e) => setSelArea(e.target.value)}>
                {areas.map((a) => <option key={a.area}>{a.area}</option>)}
              </select>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {selArea}: <b className={safety > 60 ? "text-emerald-300" : safety > 35 ? "text-amber-300" : "text-red-300"}>{safety}/100 safe</b>
              {score && <> • crime risk {score.score}/100 ({score.label}) • {score.total} cases</>}
            </p>
            <p className="mt-1 text-xs text-slate-400">Tips: avoid isolated lanes after 9pm • share live location • report suspicious activity below.</p>
          </div>
          <div className="grid h-28 w-28 place-items-center rounded-full border-8" style={{ borderColor: safety > 60 ? "#22c55e" : safety > 35 ? "#f59e0b" : "#ef4444" }}>
            <span className="text-2xl font-extrabold">{safety}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Report crime — real DB row */}
          <div className="card space-y-3">
            <p className="flex items-center gap-2 font-extrabold"><FileWarning className="h-5 w-5 text-blue-300" /> Report Crime / Give Evidence</p>
            <p className="text-xs text-slate-400">Filed reports go straight into the police database — officers see them on their map & FIR table.</p>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={report.type} onChange={(e) => setReport({ ...report, type: e.target.value })}>
                {["Theft", "Chain Snatching", "Assault", "Harassment", "Fraud", "Burglary", "Robbery", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <select className="input" value={report.area} onChange={(e) => setReport({ ...report, area: e.target.value })}>
                {areas.map((a) => <option key={a.area}>{a.area}</option>)}
              </select>
            </div>
            <textarea className="input" rows={3} placeholder="What happened? Where, when…" value={report.description} onChange={(e) => setReport({ ...report, description: e.target.value })} />
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={report.anonymous} onChange={(e) => setReport({ ...report, anonymous: e.target.checked })} /> File anonymously
            </label>
            <button onClick={submitReport} className="btn-primary w-full text-sm">Submit Report</button>
          </div>

          {/* Community alerts */}
          <div className="card space-y-3">
            <p className="flex items-center gap-2 font-extrabold"><Megaphone className="h-5 w-5 text-amber-300" /> Community Alerts</p>
            <div className="flex gap-2">
              <input className="input" placeholder="e.g. Chain snatching near station…" value={post.text} onChange={(e) => setPost({ ...post, text: e.target.value })} />
              <button onClick={submitPost} className="btn-primary shrink-0 text-sm">Post</button>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto">
              {feed.announcements.map((a) => (
                <div key={a.id} className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm">
                  <b>📢 {a.title}</b><p className="text-slate-300">{a.message}</p><p className="text-[11px] text-slate-400">{a.area}</p>
                </div>
              ))}
              {feed.community.map((c) => (
                <div key={c.id} className="rounded-xl bg-white/5 p-3 text-sm">
                  <p>{c.text}</p><p className="mt-1 text-[11px] text-slate-400">{c.area} • by {c.author?.name ?? "citizen"} • ❤ {c.likes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lost & Found with real claims */}
        <div className="card">
          <p className="flex items-center gap-2 font-extrabold"><PackageSearch className="h-5 w-5 text-emerald-300" /> Lost & Found — claim to unblur, owner approves, then chat</p>
          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <select className="input" value={lfForm.kind} onChange={(e) => setLfForm({ ...lfForm, kind: e.target.value })}><option value="lost">Lost</option><option value="found">Found</option></select>
            <input className="input" placeholder="Item" value={lfForm.item} onChange={(e) => setLfForm({ ...lfForm, item: e.target.value })} />
            <select className="input" value={lfForm.area} onChange={(e) => setLfForm({ ...lfForm, area: e.target.value })}>{areas.map((a) => <option key={a.area}>{a.area}</option>)}</select>
            <input className="input" placeholder="Description" value={lfForm.description} onChange={(e) => setLfForm({ ...lfForm, description: e.target.value })} />
            <button onClick={submitLF} className="btn-primary text-sm">Post</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {lf.map((x) => {
              const isMine = x.ownerId === session.id;
              const myClaim = claimFor(x.id);
              const convId = mineConvFor(x.id);
              const approved = convId || x.claims?.some((c: any) => c.status === "approved" && (isMine || c.claimantId === session.id));
              return (
                <div key={x.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="relative grid h-28 place-items-center overflow-hidden rounded-lg bg-black/40 text-4xl">
                    <span className={approved ? "" : "blur-md select-none"}>{x.imageEmoji || "🎒"}</span>
                    {!approved && <span className="absolute rounded bg-black/70 px-2 py-1 text-[11px]">blurred until owner approves</span>}
                  </div>
                  <p className="mt-2 text-sm font-bold">{x.kind.toUpperCase()}: {x.item}</p>
                  <p className="text-xs text-slate-400">{x.area} • by {x.owner?.name ?? "citizen"} • {x.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isMine ? (
                      <span className="rounded bg-white/10 px-2 py-1 text-[11px] text-slate-300">Your post • {x.claims?.filter((c: any) => c.status === "pending").length ?? 0} pending claims</span>
                    ) : !myClaim ? (
                      <button onClick={() => claimItem(x.id)} className="btn-ghost !px-3 !py-1.5 text-xs">This is mine — claim</button>
                    ) : myClaim.status === "pending" ? (
                      <span className="rounded bg-amber-500/15 px-2 py-1 text-[11px] text-amber-300">Claim pending owner approval…</span>
                    ) : myClaim.status === "approved" ? (
                      <button onClick={() => setActiveConv(convId)} className="btn-primary !px-3 !py-1.5 text-xs"><MessagesSquare className="h-3 w-3" /> Open chat</button>
                    ) : (
                      <span className="rounded bg-red-500/15 px-2 py-1 text-[11px] text-red-300">Claim rejected</span>
                    )}
                  </div>
                  {/* Owner: incoming claims to approve */}
                  {isMine && incoming.filter((c) => c.lostFound.id === x.id && c.status === "pending").map((c) => (
                    <div key={c.id} className="mt-2 rounded-lg bg-black/30 p-2 text-xs">
                      <p><b>{c.claimant.name}</b> claims this: “{c.message || "no message"}”</p>
                      <div className="mt-1 flex gap-2">
                        <button onClick={() => decide(c.id, "approve")} className="btn-primary !px-2 !py-1 text-[11px]">Approve + chat</button>
                        <button onClick={() => decide(c.id, "reject")} className="btn-ghost !px-2 !py-1 text-[11px]">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Real chat */}
        <div className="card">
          <p className="flex items-center gap-2 font-extrabold"><MessagesSquare className="h-5 w-5 text-blue-300" /> My Chats ({convs.length}) — live, stored in database</p>
          {convs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No chats yet. Claim an item and get approved by its owner.</p>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-[240px_1fr]">
              <div className="space-y-2">
                {convs.map((c) => (
                  <button key={c.id} onClick={() => setActiveConv(c.id)}
                    className={`w-full rounded-xl p-3 text-left text-sm ${activeConv === c.id ? "bg-brand-500 text-white" : "bg-white/5 hover:bg-white/10"}`}>
                    <p className="font-bold">{c.with.name}</p>
                    <p className="truncate text-xs opacity-80">{c.item} • {c.lastMessage?.text ?? "say hi 👋"}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                {!activeConv ? (
                  <p className="text-sm text-slate-400">Select a conversation.</p>
                ) : (
                  <>
                    <div className="max-h-64 space-y-1.5 overflow-auto">
                      {msgs.map((m) => (
                        <p key={m.id} className={`w-fit max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${m.senderId === session.id ? "ml-auto bg-brand-500" : "bg-white/10"}`}>
                          <span className="block text-[10px] opacity-70">{m.sender.name}</span>{m.text}
                        </p>
                      ))}
                      <div ref={bottomRef} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input className="input" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMsg()} placeholder="Type message…" />
                      <button className="btn-primary text-sm" onClick={sendMsg}>Send</button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">Refreshes every 2s — open two accounts in different browsers to chat live.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
