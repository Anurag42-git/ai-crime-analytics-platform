import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const [announcements, community] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.communityPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { name: true } } },
    }),
  ]);
  return NextResponse.json({ announcements, community });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  if (!b.text || !String(b.text).trim())
    return NextResponse.json({ error: "text required" }, { status: 400 });
  const row = await prisma.communityPost.create({
    data: {
      text: String(b.text).slice(0, 500),
      area: String(b.area ?? "Pune"),
      authorId: auth.user.id,
    },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json({ ok: true, data: row });
}
