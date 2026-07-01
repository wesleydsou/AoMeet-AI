import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { deleteFromB2, downloadFromB2, isB2StorageKey } from "@/lib/services/b2-storage";
import { deleteFromBunny, downloadFromBunny, isBunnyStorageKey, uploadToBunny, usesBunnyStorage } from "@/lib/services/bunny-storage";
import { uploadPolicy } from "@/lib/security";

const uploadRoot = path.join(process.cwd(), "storage", "uploads");

export type UploadKind = keyof typeof uploadPolicy;

export type StoredFile = {
  storageKey: string;
  size: number;
  originalName: string;
};

function getSafeExtension(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isAllowedUpload(input: { fileName: string; fileSize: number; contentType?: string }, kind: UploadKind) {
  const policy = uploadPolicy[kind];
  const extension = getSafeExtension(input.fileName);
  const mime = (input.contentType || "").toLowerCase().trim();

  const hasValidExtension = (policy.allowedExtensions as readonly string[]).includes(extension);
  const hasValidMime =
    !mime ||
    mime === "application/octet-stream" ||
    (policy.allowedMimePrefixes as readonly string[]).some((allowed) => mime.startsWith(allowed));

  if (!hasValidExtension || !hasValidMime) {
    return false;
  }

  return input.fileSize <= policy.maxBytes;
}

export function validateUploadMetadata(input: {
  kind: UploadKind;
  fileName: string;
  fileSize: number;
  contentType?: string;
}) {
  const policy = uploadPolicy[input.kind];

  if (!isAllowedUpload(input, input.kind)) {
    throw new Error(`Tipo de arquivo nao permitido para ${input.kind}. Use ${policy.allowedExtensions.join(", ")}.`);
  }

  if (input.fileSize > policy.maxBytes) {
    const limitMb = Math.round(policy.maxBytes / (1024 * 1024));
    throw new Error(`Arquivo excede o limite de ${limitMb} MB para ${input.kind}.`);
  }
}

async function storeLocally(buffer: Buffer, extension: string) {
  await mkdir(uploadRoot, { recursive: true });
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const fullPath = path.join(uploadRoot, fileName);
  await writeFile(fullPath, buffer);
  return fullPath;
}

export async function storeUploadedFile(file: File | null, kind: UploadKind): Promise<StoredFile | null> {
  if (!file || file.size === 0) {
    return null;
  }

  const policy = uploadPolicy[kind];

  if (!isAllowedUpload({ fileName: file.name, fileSize: file.size, contentType: file.type }, kind)) {
    throw new Error(`Tipo de arquivo nao permitido para ${kind}. Use ${policy.allowedExtensions.join(", ")}.`);
  }

  if (file.size > policy.maxBytes) {
    const limitMb = Math.round(policy.maxBytes / (1024 * 1024));
    throw new Error(`Arquivo excede o limite de ${limitMb} MB para ${kind}.`);
  }

  const extension = getSafeExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const objectKey = `meetings/${kind}/${Date.now()}-${randomUUID()}.${extension}`;

  if (usesBunnyStorage()) {
    const storageKey = await uploadToBunny(objectKey, buffer, file.type || undefined);

    return {
      storageKey,
      size: buffer.byteLength,
      originalName: file.name,
    };
  }

  const localPath = await storeLocally(buffer, extension);

  return {
    storageKey: localPath,
    size: buffer.byteLength,
    originalName: file.name,
  };
}

export async function readStoredFile(storageKey: string) {
  if (isBunnyStorageKey(storageKey)) {
    return downloadFromBunny(storageKey);
  }

  if (isB2StorageKey(storageKey)) {
    return downloadFromB2(storageKey);
  }

  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    const response = await fetch(storageKey);
    if (!response.ok) {
      throw new Error(`Failed to read remote file: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(storageKey);
}

export function getStoredFileLabel(storageKey: string | null | undefined, originalName: string | null | undefined) {
  if (!storageKey) {
    return null;
  }

  if (isBunnyStorageKey(storageKey) || isB2StorageKey(storageKey)) {
    return originalName || storageKey.split("/").pop() || "arquivo";
  }

  return originalName || path.basename(storageKey);
}

export async function deleteStoredFile(storageKey: string) {
  if (isBunnyStorageKey(storageKey)) {
    return deleteFromBunny(storageKey);
  }

  if (isB2StorageKey(storageKey)) {
    return deleteFromB2(storageKey);
  }

  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return 0;
  }

  try {
    const fileStat = await stat(storageKey);
    await unlink(storageKey);
    return fileStat.size;
  } catch {
    return 0;
  }
}

export async function purgeMeetingMediaFiles(input: {
  audioStorageKey?: string | null;
  videoStorageKey?: string | null;
  transcriptImportStorageKey?: string | null;
}) {
  const keys = [input.audioStorageKey, input.videoStorageKey, input.transcriptImportStorageKey].filter(
    (key): key is string => Boolean(key),
  );

  let bytesFreed = 0;

  for (const key of keys) {
    try {
      bytesFreed += await deleteStoredFile(key);
    } catch {
      // Segue removendo os demais arquivos mesmo se um falhar.
    }
  }

  return bytesFreed;
}
