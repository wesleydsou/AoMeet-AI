import { NextResponse } from "next/server";
import { ensureMasterPrivileges } from "@/lib/admin";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  let user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  const promoted = await ensureMasterPrivileges(user.id, user.email);
  if (promoted) {
    user = promoted;
  }

  await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({ ok: true });
}
