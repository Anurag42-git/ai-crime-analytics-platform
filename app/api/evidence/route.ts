import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const crimeId = searchParams.get("crimeId");
  const data = await prisma.evidence.findMany({
    where: crimeId ? { crimeId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { uploader: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  const tags = Array.isArray(b.tags) ? b.tags.join(",") : String(b.tags ?? "");
  const row = await prisma.evidence.create({
    data: {
      crimeId: b.crimeId ? String(b.crimeId) : null,
      fileUrl: String(b.fileUrl ?? "witness-note"),
      fileType: String(b.fileType ?? "note"),
      tags,
      uploadedBy: auth.user.id,
    },
  });
  return NextResponse.json({ ok: true, data: row });
}
