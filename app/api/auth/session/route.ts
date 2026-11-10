import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
