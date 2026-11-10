import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// GET /api/claims?view=mine|incoming
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const view = new URL(req.url).searchParams.get("view") ?? "mine";

  if (view === "incoming") {
    // claims on posts I own
    const data = await prisma.claim.findMany({
      where: { lostFound: { ownerId: auth.user.id } },
      orderBy: { createdAt: "desc" },
      include: {
        claimant: { select: { id: true, name: true, email: true } },
        lostFound: { select: { id: true, item: true, kind: true, area: true } },
        conversation: { select: { id: true } },
      },
    });
    return NextResponse.json({ data });
  }
  const data = await prisma.claim.findMany({
    where: { claimantId: auth.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      lostFound: { select: { id: true, item: true, kind: true, area: true } },
      conversation: { select: { id: true } },
    },
  });
  return NextResponse.json({ data });
}

// POST /api/claims { lostFoundId, message } — "this blurred item is mine"
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { lostFoundId, message } = await req.json();
  const post = await prisma.lostFound.findUnique({ where: { id: String(lostFoundId) } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.ownerId === auth.user.id)
    return NextResponse.json({ error: "You cannot claim your own post" }, { status: 400 });
  const dup = await prisma.claim.findFirst({
    where: { lostFoundId: post.id, claimantId: auth.user.id, status: "pending" },
  });
  if (dup) return NextResponse.json({ error: "Claim already pending", data: dup }, { status: 409 });

  const claim = await prisma.claim.create({
    data: {
      lostFoundId: post.id,
      claimantId: auth.user.id,
      message: String(message ?? "").slice(0, 300),
    },
    include: { lostFound: { select: { id: true, item: true } } },
  });
  return NextResponse.json({ ok: true, data: claim });
}
