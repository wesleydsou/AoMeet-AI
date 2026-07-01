import { prisma } from "@/lib/prisma";
import { hashExtensionToken } from "@/lib/extension-token";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export async function authenticateExtensionRequest(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  return prisma.user.findUnique({
    where: { extensionTokenHash: hashExtensionToken(token) },
    select: {
      id: true,
      email: true,
      role: true,
      plan: true,
      defaultLanguage: true,
      fileRetentionDays: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export function ensureJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("application/json");
}
