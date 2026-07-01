import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { assertStrongSecret } from "@/lib/security";
import { generateExtensionToken, hashExtensionToken } from "@/lib/extension-token";

const SESSION_COOKIE = "aomeet_session";

type SessionPayload = {
  sub: string;
  role: Role;
  email: string;
  name: string;
};

function getSecret() {
  return new TextEncoder().encode(assertStrongSecret(process.env.AUTH_SECRET, "AUTH_SECRET"));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(raw, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.sub) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.sub },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirect("/dashboard?error=Acesso restrito a administradores.");
  }

  return user;
}

export { generateExtensionToken, hashExtensionToken };
