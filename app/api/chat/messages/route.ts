import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

async function checkMember(conversationId: string, userId: string) {
  const c = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!c) return null;
  if (c.partyAId !== userId && c.partyBId !== userId) return null;
  return c;
}

// GET /api/chat/messages?conversationId= — polled every 2s by the UI
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  const ok = await checkMember(conversationId, auth.user.id);
  if (!ok) return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  const msgs = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data: msgs });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { conversationId, text } = await req.json();
  if (!text || !String(text).trim())
    return NextResponse.json({ error: "text required" }, { status: 400 });
  const ok = await checkMember(String(conversationId), auth.user.id);
  if (!ok) return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  const msg = await prisma.message.create({
    data: {
      conversationId: String(conversationId),
      senderId: auth.user.id,
      text: String(text).slice(0, 1000),
    },
    include: { sender: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ok: true, data: msg });
}
