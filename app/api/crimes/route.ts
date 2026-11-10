import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCrimeShape } from "@/lib/crime-db";
import { requireUser } from "@/lib/auth";

// NOTE: no in-process cache here — Next.js bundles shared modules per-route,
// so a module-level Map is NOT shared between GET and POST handlers.
// Correctness first: indexed SQLite queries serve 650+ rows in milliseconds.
// Production path: shared Redis cache in front of these queries.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? "50")));

  const where: any = {};
  if (area && area !== "All") where.area = area;
  if (type && type !== "All") where.type = type;
  if (from || to) {
    where.datetime = {};
    if (from) where.datetime.gte = new Date(from);
    if (to) where.datetime.lte = new Date(to);
  }
  if (q) {
    where.OR = [
      { description: { contains: q } },
      { area: { contains: q } },
      { type: { contains: q } },
    ];
  }

  const total = await prisma.crimeReport.count({ where });
  const rows = await prisma.crimeReport.findMany({
    where,
    orderBy: { datetime: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  const res = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    data: rows.map(toCrimeShape),
  };
  return NextResponse.json(res);
}

// Citizen crime report -> real CrimeReport row (officers see it instantly)
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  if (!b.type || !b.area)
    return NextResponse.json({ error: "type + area required" }, { status: 400 });
  const row = await prisma.crimeReport.create({
    data: {
      type: String(b.type),
      area: String(b.area),
      latitude: Number(b.latitude ?? 18.52),
      longitude: Number(b.longitude ?? 73.86),
      datetime: b.datetime ? new Date(b.datetime) : new Date(),
      description: String(b.description ?? ""),
      status: "Open",
      anonymous: Boolean(b.anonymous),
      reporterId: b.anonymous ? null : auth.user.id,
    },
  });
  return NextResponse.json({ ok: true, data: toCrimeShape(row) });
}
