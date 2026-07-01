import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  startMultipartUpload,
  uploadMultipartPart,
  usesB2Storage,
} from "@/lib/services/b2-storage";
import { validateUploadMetadata, type UploadKind } from "@/lib/services/storage";

export const maxDuration = 120;
export const runtime = "nodejs";

/** Cada parte fica abaixo do limite de body da Vercel (~4.5 MB). */
export const MULTIPART_CHUNK_BYTES = 3 * 1024 * 1024;

const initSchema = z.object({
  phase: z.literal("init"),
  kind: z.enum(["audio", "video", "transcript"]),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
  contentType: z.string().trim().max(120).optional(),
});

const completeSchema = z.object({
  phase: z.literal("complete"),
  uploadId: z.string().min(1),
  objectKey: z.string().min(1),
  originalName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      etag: z.string().min(1),
    }),
  ),
});

function getSafeExtension(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (!usesB2Storage()) {
    return NextResponse.json({ error: "Backblaze B2 nao configurado." }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Parte do arquivo muito grande." }, { status: 413 });
    }

    const uploadId = formData.get("uploadId");
    const objectKey = formData.get("objectKey");
    const partNumberRaw = formData.get("partNumber");
    const chunk = formData.get("chunk");

    if (typeof uploadId !== "string" || typeof objectKey !== "string" || typeof partNumberRaw !== "string") {
      return NextResponse.json({ error: "Dados da parte invalidos." }, { status: 400 });
    }

    if (!(chunk instanceof File) || chunk.size === 0) {
      return NextResponse.json({ error: "Parte vazia." }, { status: 400 });
    }

    if (chunk.size > MULTIPART_CHUNK_BYTES + 256 * 1024) {
      return NextResponse.json({ error: "Parte excede o tamanho permitido." }, { status: 400 });
    }

    const partNumber = Number(partNumberRaw);
    if (!Number.isInteger(partNumber) || partNumber < 1) {
      return NextResponse.json({ error: "Numero da parte invalido." }, { status: 400 });
    }

    try {
      const buffer = Buffer.from(await chunk.arrayBuffer());
      const part = await uploadMultipartPart({
        objectKey,
        uploadId,
        partNumber,
        body: buffer,
      });

      return NextResponse.json(part);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Falha ao enviar parte." },
        { status: 500 },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const phase = typeof body === "object" && body && "phase" in body ? body.phase : null;

  if (phase === "init") {
    const parsed = initSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    try {
      validateUploadMetadata({
        kind: parsed.data.kind as UploadKind,
        fileName: parsed.data.fileName,
        fileSize: parsed.data.fileSize,
        contentType: parsed.data.contentType,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Arquivo invalido." },
        { status: 400 },
      );
    }

    const extension = getSafeExtension(parsed.data.fileName);
    const objectKey = `meetings/${parsed.data.kind}/${Date.now()}-${randomUUID()}.${extension}`;

    try {
      const started = await startMultipartUpload(objectKey, parsed.data.contentType);

      return NextResponse.json({
        ...started,
        chunkSize: MULTIPART_CHUNK_BYTES,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Falha ao iniciar upload." },
        { status: 500 },
      );
    }
  }

  if (phase === "complete") {
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    try {
      const storageKey = await completeMultipartUpload({
        objectKey: parsed.data.objectKey,
        uploadId: parsed.data.uploadId,
        parts: parsed.data.parts,
      });

      return NextResponse.json({
        storageKey,
        originalName: parsed.data.originalName,
        size: parsed.data.fileSize,
      });
    } catch (error) {
      try {
        await abortMultipartUpload(parsed.data.objectKey, parsed.data.uploadId);
      } catch {
        // ignore abort failure
      }

      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Falha ao finalizar upload." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Fase de upload invalida." }, { status: 400 });
}
