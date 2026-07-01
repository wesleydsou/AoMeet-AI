import { NextResponse } from "next/server";
import { ensureMasterPrivileges } from "@/lib/admin";
import { createSession, hashPassword } from "@/lib/auth";
import { generateExtensionToken, hashExtensionToken } from "@/lib/extension-token";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json({ error: "Ja existe uma conta com este e-mail." }, { status: 409 });
  }

  const extensionToken = generateExtensionToken();

  let user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      extensionTokenHash: hashExtensionToken(extensionToken),
    },
  });

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

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
    extensionToken,
  });
}
