import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// Accepts CSV text (Excel export) or JSON rows. Validates AND persists to DB.
export async function POST(req: NextRequest) {
  const auth = await requireUser(["OFFICER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const ct = req.headers.get("content-type") ?? "";
  let rows: any[] = [];
  if (ct.includes("application/json")) {
    const b = await req.json();
    rows = b.rows ?? b.data ?? [];
  } else {
    const text = await req.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    rows = lines.slice(1, 2001).map((ln, i) => {
      const cols = ln.split(",");
      const o: any = { _row: i + 2 };
      headers.forEach((h, j) => (o[h] = (cols[j] ?? "").trim().replace(/^"|"$/g, "")));
      return o;
    });
  }

  const errors: string[] = [];
  const valid = rows.filter((r, i) => {
    const type = r.type || r.crime || r.title;
    const area = r.area || r.location;
    if (!type || !area) {
      errors.push(`row ${r._row ?? i + 2}: missing type/area`);
      return false;
    }
    return true;
  });

  // Persist valid rows — they immediately affect maps, risk scores, FIR table
  let inserted = 0;
  if (valid.length > 0) {
    const res = await prisma.crimeReport.createMany({
      data: valid.map((r) => ({
        type: String(r.type || r.crime || r.title),
        area: String(r.area || r.location),
        latitude: Number(r.latitude ?? r.lat ?? 18.52) || 18.52,
        longitude: Number(r.longitude ?? r.lng ?? 73.86) || 73.86,
        datetime: r.datetime || r.date ? new Date(r.datetime || r.date) : new Date(),
        description: String(r.description || `${r.type} reported in ${r.area}`),
        status: "Open",
      })),
    });
    inserted = res.count;
  }

  return NextResponse.json({
    ok: true,
    received: rows.length,
    valid: valid.length,
    inserted,
    errors: errors.slice(0, 10),
    preview: valid.slice(0, 10),
  });
}
