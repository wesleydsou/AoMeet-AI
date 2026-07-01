import { z } from "zod";

export const updateUserAdminSchema = z.object({
  userId: z.string().cuid(),
  plan: z.enum(["FREE", "PRO", "BUSINESS", "PREMIUM"]),
  role: z.enum(["ADMIN", "USER"]),
});

export const resetUsageAdminSchema = z.object({
  userId: z.string().cuid(),
});
