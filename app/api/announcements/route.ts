import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const data = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(["OFFICER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  if (!b.title || !b.message)
    return NextResponse.json({ error: "title + message required" }, { status: 400 });
  const row = await prisma.announcement.create({
    data: {
      title: String(b.title),
      message: String(b.message),
      area: String(b.area ?? "All Pune"),
      severity: String(b.severity ?? "info"),
    },
  });
  return NextResponse.json({ ok: true, data: row });
}
