import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDirectUploadTarget, usesBunnyStorage } from "@/lib/services/bunny-storage";
import { validateUploadMetadata, type UploadKind } from "@/lib/services/storage";
import { z } from "zod";

const uploadUrlSchema = z.object({
  kind: z.enum(["audio", "video", "transcript"]),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
  contentType: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (!usesBunnyStorage()) {
    return NextResponse.json({ useDirect: true });
  }

  const parsed = uploadUrlSchema.safeParse(await request.json());
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

  const extension = parsed.data.fileName.includes(".")
    ? parsed.data.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"
    : "bin";

  const contentType = parsed.data.contentType || "application/octet-stream";
  const objectKey = `meetings/${parsed.data.kind}/${Date.now()}-${randomUUID()}.${extension}`;

  try {
    const result = createDirectUploadTarget(objectKey, contentType);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao gerar URL de upload." },
      { status: 500 },
    );
  }
}
