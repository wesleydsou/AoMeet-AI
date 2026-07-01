"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { generateExtensionToken, hashExtensionToken } from "@/lib/extension-token";
import { prisma } from "@/lib/prisma";
import { registerSchema, loginSchema } from "@/lib/validations/auth";

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados invalidos.")}`);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (existing) {
    redirect("/register?error=Ja existe uma conta com este e-mail.");
  }

  const extensionToken = generateExtensionToken();

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      extensionTokenHash: hashExtensionToken(extensionToken),
    },
  });

  await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  redirect(`/settings?extensionToken=${encodeURIComponent(extensionToken)}&success=Conta criada. Guarde o token da extensao.`);
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados invalidos.")}`);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    redirect("/login?error=Credenciais invalidas.");
  }

  await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
