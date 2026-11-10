import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "email + password required" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !verifyPassword(String(password), user.passwordHash))
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  await createSession(user.id);
  const { passwordHash, ...safe } = user as any;
  return NextResponse.json({ ok: true, user: safe });
}
