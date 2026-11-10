import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "./db";

const SESSION_DAYS = 7;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(":");
    const calc = scryptSync(password, salt, 64);
    return timingSafeEqual(Buffer.from(hash, "hex"), calc);
  } catch {
    return false;
  }
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  cookies().set("acap-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const token = cookies().get("acap-token")?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  cookies().delete("acap-token");
}

export async function getSessionUser() {
  const token = cookies().get("acap-token")?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!s || s.expiresAt < new Date()) {
    if (s) await prisma.session.delete({ where: { token } });
    return null;
  }
  const { passwordHash, ...safe } = s.user as any;
  return safe as { id: string; email: string; name: string; role: string };
}

export async function requireUser(roles?: string[]) {
  const u = await getSessionUser();
  if (!u) return { error: "Not logged in", status: 401 } as const;
  if (roles && !roles.includes(u.role))
    return { error: "Forbidden for role " + u.role, status: 403 } as const;
  return { user: u } as const;
}
