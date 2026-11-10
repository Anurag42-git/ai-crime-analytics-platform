import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCrimeShape } from "@/lib/crime-db";
import { scoreAllAreas, scoreArea } from "@/lib/risk";

// NOTE: see crimes/route.ts — no in-process cache (per-route module instances).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");

  // Real data from DB (all rows — 650, fast with index)
  const rows = await prisma.crimeReport.findMany({
    select: { id: true, type: true, area: true, latitude: true, longitude: true, datetime: true, description: true, status: true },
  });
  const crimes = rows.map(toCrimeShape);

  await new Promise((r) => setTimeout(r, 80)); // async inference slot

  const res = area
    ? { areas: [scoreArea(area, crimes as any)] }
    : { areas: scoreAllAreas(crimes as any) };
  return NextResponse.json({ ...res, model: "explainable-rule-v1 (freq 40 + recency 25 + severity 20 + night 15)" });
}
