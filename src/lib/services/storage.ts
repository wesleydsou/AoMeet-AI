import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { uploadPolicy } from "@/lib/security";

const uploadRoot = path.join(process.cwd(), "storage", "uploads");

type UploadKind = keyof typeof uploadPolicy;

export type StoredFile = {
  storageKey: string;
  size: number;
  originalName: string;
};

function getSafeExtension(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
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
  const extension = getSafeExtension(file.name);
  const hasValidMime = (policy.allowedMimePrefixes as readonly string[]).some((allowed) => file.type.startsWith(allowed));
  const hasValidExtension = (policy.allowedExtensions as readonly string[]).includes(extension);

  if (!hasValidMime || !hasValidExtension) {
    throw new Error(`Tipo de arquivo nao permitido para ${kind}.`);
  }

  if (file.size > policy.maxBytes) {
    throw new Error(`Arquivo excede o limite permitido para ${kind}.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blobPath = `meetings/${kind}/${Date.now()}-${randomUUID()}.${extension}`;

  if (usesBlobStorage()) {
    const blob = await put(blobPath, buffer, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || undefined,
    });

    return {
      storageKey: blob.url,
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
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    const response = await fetch(storageKey);
    if (!response.ok) {
      throw new Error(`Failed to read blob: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(storageKey);
}

export function getStoredFileLabel(storageKey: string | null | undefined, originalName: string | null | undefined) {
  if (!storageKey) {
    return null;
  }

  return originalName || path.basename(storageKey);
}
