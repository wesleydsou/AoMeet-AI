"use server";

import { redirect } from "next/navigation";
import { generateExtensionToken, hashExtensionToken, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "@/lib/validations/settings";

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    defaultLanguage: formData.get("defaultLanguage"),
    fileRetentionDays: formData.get("fileRetentionDays"),
  });

  if (!parsed.success) {
    redirect(`/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados invalidos.")}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });

  redirect("/settings?success=Configuracoes atualizadas.");
}

export async function regenerateExtensionTokenAction() {
  const user = await requireUser();
  const extensionToken = generateExtensionToken();

  await prisma.user.update({
    where: { id: user.id },
    data: { extensionTokenHash: hashExtensionToken(extensionToken) },
  });

  redirect(`/settings?extensionToken=${encodeURIComponent(extensionToken)}&success=Token da extensao regenerado.`);
}
