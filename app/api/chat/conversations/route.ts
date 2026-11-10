import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// My conversations (as either party), with other party + last message
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ partyAId: auth.user.id }, { partyBId: auth.user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      partyA: { select: { id: true, name: true } },
      partyB: { select: { id: true, name: true } },
      claim: { include: { lostFound: { select: { item: true, kind: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const data = convs.map((c) => ({
    id: c.id,
    with: c.partyAId === auth.user.id ? c.partyB : c.partyA,
    item: c.claim.lostFound.item,
    kind: c.claim.lostFound.kind,
    lastMessage: c.messages[0] ?? null,
  }));
  return NextResponse.json({ data });
}
