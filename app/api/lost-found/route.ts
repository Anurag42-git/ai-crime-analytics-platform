import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const data = await prisma.lostFound.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true } },
      claims: { select: { id: true, status: true, claimantId: true } },
    },
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  if (!b.item || !String(b.item).trim())
    return NextResponse.json({ error: "item required" }, { status: 400 });
  const row = await prisma.lostFound.create({
    data: {
      kind: b.kind === "found" ? "found" : "lost",
      item: String(b.item).slice(0, 120),
      area: String(b.area ?? "Pune"),
      description: String(b.description ?? "").slice(0, 500),
      imageEmoji: String(b.imageEmoji ?? "🎒"),
      ownerId: auth.user.id,
    },
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ok: true, data: row });
}
