"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validations/client";

export async function createClientAction(formData: FormData) {
  const user = await requireUser();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    redirect(`/clients?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados invalidos.")}`);
  }

  await prisma.client.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  });

  redirect("/clients?success=Cliente criado com sucesso.");
}
