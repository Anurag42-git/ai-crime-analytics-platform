import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// PATCH /api/claims/:id { action: "approve" | "reject" } — only the post owner
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { action } = await req.json();

  const claim = await prisma.claim.findUnique({
    where: { id: params.id },
    include: { lostFound: true, conversation: true },
  });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  if (claim.lostFound.ownerId !== auth.user.id)
    return NextResponse.json({ error: "Only the post owner can decide" }, { status: 403 });
  if (claim.status !== "pending")
    return NextResponse.json({ error: "Already decided" }, { status: 400 });

  if (action === "reject") {
    const updated = await prisma.claim.update({ where: { id: claim.id }, data: { status: "rejected" } });
    return NextResponse.json({ ok: true, data: updated });
  }
  if (action !== "approve")
    return NextResponse.json({ error: "action must be approve|reject" }, { status: 400 });

  // Approve: mark claimed + open a private conversation between owner and claimant
  const [updated, conversation] = await prisma.$transaction([
    prisma.claim.update({ where: { id: claim.id }, data: { status: "approved" } }),
    prisma.conversation.create({
      data: {
        claimId: claim.id,
        partyAId: claim.lostFound.ownerId!,
        partyBId: claim.claimantId,
      },
    }),
    prisma.lostFound.update({ where: { id: claim.lostFoundId }, data: { status: "claimed" } }),
  ]);
  return NextResponse.json({ ok: true, data: updated, conversation });
}
