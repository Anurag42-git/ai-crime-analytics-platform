import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";

export async function GET() {
  const rows = await prisma.lostFound.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true } },
      claims: { select: { id: true, status: true, claimantId: true } },
    },
  });

  // Privacy: the photo and the description are the "secret" that proves ownership.
  // Only the owner and an approved claimant receive them — redacted server-side so
  // they are absent from the network response, not merely blurred in the CSS.
  const user = await getSessionUser();
  const data = rows.map((r) => {
    const isOwner = !!user && r.ownerId === user.id;
    const approvedForMe = !!user && r.claims.some((c) => c.status === "approved" && c.claimantId === user.id);
    if (isOwner || approvedForMe) return r;
    return { ...r, imageEmoji: "", description: "" };
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  if (!b.item || !String(b.item).trim())
    return NextResponse.json({ error: "item required" }, { status: 400 });
  // imageEmoji holds a short emoji, a compressed photo data-URL, or an https image URL.
  // Only those three shapes are accepted so a stored value can never be javascript: etc.
  const img = String(b.imageEmoji ?? "🎒");
  const imageEmoji = img.startsWith("data:image/")
    ? img.slice(0, 400_000)
    : /^https?:\/\//i.test(img)
      ? img.slice(0, 1000)
      : img.slice(0, 16);
  const row = await prisma.lostFound.create({
    data: {
      kind: b.kind === "found" ? "found" : "lost",
      item: String(b.item).slice(0, 120),
      area: String(b.area ?? "Pune"),
      description: String(b.description ?? "").slice(0, 500),
      imageEmoji,
      ownerId: auth.user.id,
    },
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ok: true, data: row });
}
