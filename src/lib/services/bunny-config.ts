const BUNNY_PREFIX = "bunny:";

function sanitizeEnv(value: string | undefined) {
  return (value || "").trim();
}

export function getBunnyConfig() {
  const storageZone = sanitizeEnv(process.env.BUNNY_STORAGE_ZONE);
  const hostname = sanitizeEnv(process.env.BUNNY_STORAGE_HOSTNAME) || "ny.storage.bunnycdn.com";
  const password = sanitizeEnv(process.env.BUNNY_STORAGE_PASSWORD);
  const cdnHostname = sanitizeEnv(process.env.BUNNY_CDN_HOSTNAME);

  if (!storageZone || !password) {
    return null;
  }

  return {
    storageZone,
    hostname,
    password,
    cdnHostname,
    baseUrl: `https://${hostname}/${storageZone}`,
  };
}

export function usesBunnyStorage() {
  return Boolean(getBunnyConfig());
}

export function formatBunnyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
    return "Credenciais Bunny invalidas. Confira BUNNY_STORAGE_PASSWORD na Vercel.";
  }

  if (message.includes("404")) {
    return "Arquivo nao encontrado no Bunny Storage.";
  }

  return message || "Erro desconhecido no Bunny Storage.";
}

export { BUNNY_PREFIX };

export function isBunnyStorageKey(storageKey: string) {
  return storageKey.startsWith(BUNNY_PREFIX);
}

export function toBunnyStorageKey(objectKey: string) {
  return `${BUNNY_PREFIX}${objectKey}`;
}

export function toObjectKey(storageKey: string) {
  return storageKey.slice(BUNNY_PREFIX.length);
}
