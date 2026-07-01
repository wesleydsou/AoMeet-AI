import { createHash, randomBytes } from "node:crypto";

export function generateExtensionToken() {
  return `aosafe_ext_${randomBytes(24).toString("hex")}`;
}

export function hashExtensionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
