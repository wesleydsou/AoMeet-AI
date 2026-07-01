import { Plan, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MASTER_ADMIN_EMAIL = (process.env.MASTER_ADMIN_EMAIL || "wesley.souza@aosafe.com.br").toLowerCase();

export function isMasterEmail(email: string) {
  return email.toLowerCase() === MASTER_ADMIN_EMAIL;
}

export function isAdminUser(user: { role: Role; email: string }) {
  return user.role === Role.ADMIN || isMasterEmail(user.email);
}

export async function ensureMasterPrivileges(userId: string, email: string) {
  if (!isMasterEmail(email)) {
    return null;
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      role: Role.ADMIN,
      plan: Plan.PREMIUM,
    },
  });
}

export function hasUnlimitedAccess(user: { role: Role; email: string }) {
  return isAdminUser(user);
}
