import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, name, role } = await req.json();
  const cleanEmail = String(email ?? "").toLowerCase().trim();
  if (!cleanEmail || !password || String(password).length < 6)
    return NextResponse.json({ error: "Valid email + min 6-char password required" }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (exists) return NextResponse.json({ error: "Email already registered — please login" }, { status: 409 });
  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      name: String(name ?? cleanEmail.split("@")[0]),
      role: role === "OFFICER" ? "OFFICER" : "CITIZEN",
      passwordHash: hashPassword(String(password)),
    },
  });
  await createSession(user.id);
  const { passwordHash, ...safe } = user as any;
  return NextResponse.json({ ok: true, user: safe });
}
