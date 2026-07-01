import { Plan } from "@prisma/client";
import { planLimits } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";

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

export async function canCreateMeeting(userId: string, plan: Plan) {
  const usage = await getOrCreateUsage(userId);
  const limits = getPlanLimits(plan);

  return {
    allowed: usage.meetingsUsed < limits.meetings,
    usage,
    limits,
  };
}

export async function canUseAi(userId: string, plan: Plan, credits = 1) {
  const usage = await getOrCreateUsage(userId);
  const limits = getPlanLimits(plan);

  return {
    allowed: usage.aiCreditsUsed + credits <= limits.aiCredits,
    usage,
    limits,
  };
}

export async function canUseStorage(userId: string, plan: Plan, bytes: number) {
  const usage = await getOrCreateUsage(userId);
  const limits = getPlanLimits(plan);

  return {
    allowed: usage.storageUsed + bytes <= limits.storageBytes,
    usage,
    limits,
  };
}
