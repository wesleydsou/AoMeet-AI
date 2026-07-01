import {
  BUNNY_PREFIX,
  formatBunnyError,
  getBunnyConfig,
  isBunnyStorageKey,
  toBunnyStorageKey,
  toObjectKey,
  usesBunnyStorage,
} from "@/lib/services/bunny-config";

export { BUNNY_PREFIX, isBunnyStorageKey, toBunnyStorageKey, toObjectKey, usesBunnyStorage, getBunnyConfig };

async function withBunnyError<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(formatBunnyError(error));
  }
}

export async function uploadToBunny(objectKey: string, buffer: Buffer, contentType?: string) {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error("Bunny Storage nao configurado.");
  }

  return withBunnyError(async () => {
    const response = await fetch(`${config.baseUrl}/${objectKey}`, {
      method: "PUT",
      headers: {
        AccessKey: config.password,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Upload Bunny falhou (${response.status}): ${detail.slice(0, 200)}`);
    }

    return toBunnyStorageKey(objectKey);
  });
}

/** Upload direto do navegador ao Bunny (arquivos grandes). Requer CORS na Storage Zone. */
export function createDirectUploadTarget(objectKey: string, contentType: string) {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error("Bunny Storage nao configurado.");
  }

  return {
    uploadUrl: `${config.baseUrl}/${objectKey}`,
    accessKey: config.password,
    storageKey: toBunnyStorageKey(objectKey),
    contentType,
  };
}

export async function downloadFromBunny(storageKey: string) {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error("Bunny Storage nao configurado.");
  }

  const objectKey = toObjectKey(storageKey);

  return withBunnyError(async () => {
    const response = await fetch(`${config.baseUrl}/${objectKey}`, {
      headers: { AccessKey: config.password },
    });

    if (!response.ok) {
      throw new Error(`Download Bunny falhou (${response.status}).`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new Error("Arquivo vazio no Bunny Storage.");
    }

    return buffer;
  });
}

export async function deleteFromBunny(storageKey: string) {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error("Bunny Storage nao configurado.");
  }

  const objectKey = toObjectKey(storageKey);

  return withBunnyError(async () => {
    const head = await fetch(`${config.baseUrl}/${objectKey}`, {
      method: "HEAD",
      headers: { AccessKey: config.password },
    }).catch(() => null);

    const response = await fetch(`${config.baseUrl}/${objectKey}`, {
      method: "DELETE",
      headers: { AccessKey: config.password },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Exclusao Bunny falhou (${response.status}).`);
    }

    const contentLength = head?.headers.get("content-length");
    return contentLength ? Number.parseInt(contentLength, 10) || 0 : 0;
  });
}
