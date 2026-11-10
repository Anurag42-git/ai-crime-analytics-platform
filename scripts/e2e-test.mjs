// E2E: citizen claims another citizen's item -> owner approves -> both chat.
// Run while server is up: node scripts/e2e-test.mjs [baseUrl]
const BASE = process.argv[2] ?? "http://localhost:3100";

async function api(method, path, cookie, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  const setCookie = r.headers.get("set-cookie");
  return { status: r.status, data, cookie: setCookie ? setCookie.split(";")[0] : cookie };
}

const login = (email) => api("POST", "/api/auth/login", null, { email, password: "demo123" });

async function main() {
  // Priya claims Aarav's wallet post
  let r = await login("priya@demo.com");
  if (!r.data.ok) throw new Error("priya login failed: " + JSON.stringify(r.data));
  const priya = r.cookie;

  r = await api("GET", "/api/lost-found", priya);
  const target = r.data.data.find((x) => x.ownerId !== undefined && x.kind === "lost" && x.item.includes("wallet"));
  if (!target) throw new Error("wallet post not found");
  console.log("1. lost-found visible:", r.data.data.length, "posts | target:", target.item, "by", target.owner.name);

  r = await api("POST", "/api/claims", priya, { lostFoundId: target.id, message: "Black wallet with ID card, lost on FC road" });
  if (!r.data.ok) throw new Error("claim failed: " + JSON.stringify(r.data));
  const claimId = r.data.data.id;
  console.log("2. claim created:", claimId);

  r = await api("POST", "/api/claims", priya, { lostFoundId: target.id, message: "dup" });
  console.log("3. duplicate claim blocked:", r.status === 409 ? "OK" : "FAIL:" + r.status);

  // Owner (Aarav) approves
  r = await login("citizen@demo.com");
  const aarav = r.cookie;
  r = await api("GET", "/api/claims?view=incoming", aarav);
  console.log("4. owner sees incoming claims:", r.data.data.length);
  r = await api("PATCH", `/api/claims/${claimId}`, aarav, { action: "approve" });
  if (!r.data.ok) throw new Error("approve failed: " + JSON.stringify(r.data));
  const convId = r.data.conversation.id;
  console.log("5. approved, conversation opened:", convId);

  r = await api("POST", "/api/chat/messages", aarav, { conversationId: convId, text: "Hi! I found your wallet near FC road gate." });
  if (!r.data.ok) throw new Error("send failed: " + JSON.stringify(r.data));

  // Priya reads + replies
  r = await api("GET", "/api/chat/conversations", priya);
  console.log("6. priya conversations:", r.data.data.length, "| with:", r.data.data[0]?.with.name);
  r = await api("GET", `/api/chat/messages?conversationId=${convId}`, priya);
  console.log("7. priya reads messages:", r.data.data.map((m) => `${m.sender.name}: ${m.text}`).join(" | "));
  await api("POST", "/api/chat/messages", priya, { conversationId: convId, text: "Thank you! Can we meet at Deccan at 5pm?" });

  r = await api("GET", `/api/chat/messages?conversationId=${convId}`, aarav);
  console.log("8. owner sees thread:", r.data.data.length, "messages");

  // Outsider (Rahul) must be blocked
  r = await login("rahul@demo.com");
  r = await api("GET", `/api/chat/messages?conversationId=${convId}`, r.cookie);
  console.log("9. outsider blocked:", r.status === 403 ? "OK" : "FAIL:" + r.status);

  // Citizen report -> officer-visible crime
  r = await login("priya@demo.com");
  const before = await api("GET", "/api/crimes?limit=1", null).then((x) => x.data.total);
  const postRes = await api("POST", "/api/crimes", r.cookie, { type: "Theft", area: "Baner", description: "E2E test report" });
  console.log("10a. POST /api/crimes ->", postRes.status, JSON.stringify(postRes.data).slice(0, 300));
  const after = await api("GET", "/api/crimes?limit=1", null).then((x) => x.data.total);
  const altKey = await api("GET", "/api/crimes?limit=2", null).then((x) => x.data.total);
  const search = await api("GET", "/api/crimes?q=E2E%20test%20report", null).then((x) => x.data);
  console.log("10b. alt-key total:", altKey, "| search hits:", search.total, JSON.stringify(search.data.map((d) => d.id)));
  if (after !== before + 1) throw new Error(`citizen report not persisted (${before}->${after})`);
  console.log("10. citizen report persisted: OK");

  console.log("E2E PASSED");
}

main().catch((e) => {
  console.error("E2E FAILED:", e.message);
  process.exit(1);
});
