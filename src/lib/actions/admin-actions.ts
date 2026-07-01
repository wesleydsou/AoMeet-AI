"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMasterEmail } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";
import { resetUsageAdminSchema, updateUserAdminSchema } from "@/lib/validations/admin";

export async function updateUserAdminAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateUserAdminSchema.safeParse({
    userId: formData.get("userId"),
    plan: formData.get("plan"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(`/admin?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados invalidos.")}`);
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { email: true },
  });

  if (!target) {
    redirect("/admin?error=Usuario nao encontrado.");
  }

  const role = isMasterEmail(target.email) ? "ADMIN" : parsed.data.role;
  const plan = isMasterEmail(target.email) ? "PREMIUM" : parsed.data.plan;

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      plan,
      role,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?success=Usuario atualizado com sucesso.");
}

export async function resetUserUsageAdminAction(formData: FormData) {
  await requireAdmin();

  const parsed = resetUsageAdminSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    redirect("/admin?error=Dados invalidos.");
  }

  const month = monthKey();

  await prisma.monthlyUsage.upsert({
    where: {
      userId_month: {
        userId: parsed.data.userId,
        month,
      },
    },
    update: {
      meetingsUsed: 0,
      aiCreditsUsed: 0,
      storageUsed: 0,
    },
    create: {
      userId: parsed.data.userId,
      month,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?success=Uso mensal zerado para o usuario.");
}
