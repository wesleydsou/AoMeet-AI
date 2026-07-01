import { Plan } from "@prisma/client";
import { hasUnlimitedAccess } from "@/lib/admin";
import { planLimits } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";
import type { Role } from "@prisma/client";

type UserLimitsContext = { id: string; plan: Plan; role: Role; email: string };

export async function getOrCreateUsage(userId: string) {
  const month = monthKey();

  return prisma.monthlyUsage.upsert({
    where: {
      userId_month: {
        userId,
        month,
      },
    },
    update: {},
    create: {
      userId,
      month,
    },
  });
}

export function getPlanLimits(plan: Plan) {
  return planLimits[plan];
}

export async function incrementUsage(userId: string, input: { meetings?: number; aiCredits?: number; storageBytes?: number }) {
  const usage = await getOrCreateUsage(userId);

  return prisma.monthlyUsage.update({
    where: { id: usage.id },
    data: {
      meetingsUsed: { increment: input.meetings ?? 0 },
      aiCreditsUsed: { increment: input.aiCredits ?? 0 },
      storageUsed: { increment: input.storageBytes ?? 0 },
    },
  });
}

export async function decrementUsage(userId: string, input: { storageBytes?: number }) {
  const usage = await getOrCreateUsage(userId);
  const nextStorage = Math.max(0, usage.storageUsed - (input.storageBytes ?? 0));

  return prisma.monthlyUsage.update({
    where: { id: usage.id },
    data: {
      storageUsed: nextStorage,
    },
  });
}

export async function canCreateMeeting(user: UserLimitsContext) {
  if (hasUnlimitedAccess(user)) {
    return { allowed: true, usage: await getOrCreateUsage(user.id), limits: getPlanLimits(user.plan) };
  }

  const usage = await getOrCreateUsage(user.id);
  const limits = getPlanLimits(user.plan);

  return {
    allowed: usage.meetingsUsed < limits.meetings,
    usage,
    limits,
  };
}

export async function canUseAi(user: UserLimitsContext, credits = 1) {
  if (hasUnlimitedAccess(user)) {
    return { allowed: true, usage: await getOrCreateUsage(user.id), limits: getPlanLimits(user.plan) };
  }

  const usage = await getOrCreateUsage(user.id);
  const limits = getPlanLimits(user.plan);

  return {
    allowed: usage.aiCreditsUsed + credits <= limits.aiCredits,
    usage,
    limits,
  };
}

export async function canUseStorage(user: UserLimitsContext, bytes: number) {
  if (hasUnlimitedAccess(user)) {
    return { allowed: true, usage: await getOrCreateUsage(user.id), limits: getPlanLimits(user.plan) };
  }

  const usage = await getOrCreateUsage(user.id);
  const limits = getPlanLimits(user.plan);

  return {
    allowed: usage.storageUsed + bytes <= limits.storageBytes,
    usage,
    limits,
  };
}
