import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadToB2, usesB2Storage } from "@/lib/services/b2-storage";
import { storeUploadedFile, validateUploadMetadata, type UploadKind } from "@/lib/services/storage";

export const maxDuration = 120;
export const runtime = "nodejs";

function getSafeExtension(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Corpo da requisicao invalido ou arquivo muito grande." }, { status: 413 });
  }

  const kind = formData.get("kind");
  const file = formData.get("file");

  if (typeof kind !== "string" || !["audio", "video", "transcript"].includes(kind)) {
    return NextResponse.json({ error: "Tipo de upload invalido." }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo nao informado." }, { status: 400 });
  }

  const uploadKind = kind as UploadKind;

  try {
    validateUploadMetadata({
      kind: uploadKind,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Arquivo invalido." },
      { status: 400 },
    );
  }

  try {
    if (usesB2Storage()) {
      const extension = getSafeExtension(file.name);
      const objectKey = `meetings/${uploadKind}/${Date.now()}-${randomUUID()}.${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const storageKey = await uploadToB2(objectKey, buffer, file.type || undefined);

      return NextResponse.json({
        storageKey,
        originalName: file.name,
        size: buffer.byteLength,
      });
    }

    const stored = await storeUploadedFile(file, uploadKind);
    if (!stored) {
      return NextResponse.json({ error: "Falha ao salvar arquivo." }, { status: 500 });
    }

    return NextResponse.json(stored);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao enviar arquivo." },
      { status: 500 },
    );
  }
}
