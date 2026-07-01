"use client";

import { useState, useTransition } from "react";
import { createMeetingAction } from "@/lib/actions/meeting-actions";
import type { UploadKind } from "@/lib/services/storage";

type ClientOption = { id: string; companyName: string };

/** Limite seguro para upload unico via Vercel (~4.5 MB). */
const SERVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

const uploadFields: Array<{ kind: UploadKind; field: string; label: string }> = [
  { kind: "audio", field: "audioFile", label: "audio" },
  { kind: "video", field: "videoFile", label: "video" },
  { kind: "transcript", field: "transcriptFile", label: "transcricao" },
];

type UploadResult = {
  storageKey: string;
  originalName: string;
  size: number;
};

async function readApiPayload<T extends Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 200) || "Resposta invalida do servidor.");
  }
}

async function uploadFileViaServer(file: File, kind: UploadKind): Promise<UploadResult> {
  const body = new FormData();
  body.set("kind", kind);
  body.set("file", file);

  const response = await fetch("/api/meetings/upload", {
    method: "POST",
    body,
  });

  const payload = await readApiPayload<{
    storageKey?: string;
    originalName?: string;
    size?: number;
    error?: string;
  }>(response);

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error("SERVER_TOO_LARGE");
    }
    throw new Error(payload.error || `Falha ao enviar ${kind}.`);
  }

  if (!payload.storageKey || !payload.originalName || !payload.size) {
    throw new Error(`Resposta invalida ao enviar ${kind}.`);
  }

  return {
    storageKey: payload.storageKey,
    originalName: payload.originalName,
    size: payload.size,
  };
}

async function uploadFileViaMultipart(
  file: File,
  kind: UploadKind,
  onProgress?: (message: string) => void,
): Promise<UploadResult> {
  const contentType = file.type || "application/octet-stream";

  const initResponse = await fetch("/api/meetings/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "init",
      kind,
      fileName: file.name,
      fileSize: file.size,
      contentType,
    }),
  });

  const initPayload = await readApiPayload<{
    uploadId?: string;
    objectKey?: string;
    storageKey?: string;
    chunkSize?: number;
    error?: string;
  }>(initResponse);

  if (!initResponse.ok || !initPayload.uploadId || !initPayload.objectKey || !initPayload.chunkSize) {
    throw new Error(initPayload.error || `Falha ao iniciar upload de ${kind}.`);
  }

  const chunkSize = initPayload.chunkSize;
  const totalParts = Math.ceil(file.size / chunkSize);
  const parts: Array<{ partNumber: number; etag: string }> = [];

  for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
    const start = (partNumber - 1) * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    onProgress?.(`Enviando parte ${partNumber}/${totalParts}...`);

    const partBody = new FormData();
    partBody.set("uploadId", initPayload.uploadId);
    partBody.set("objectKey", initPayload.objectKey);
    partBody.set("partNumber", String(partNumber));
    partBody.set("chunk", chunk, `${file.name}.part${partNumber}`);

    const partResponse = await fetch("/api/meetings/upload/multipart", {
      method: "POST",
      body: partBody,
    });

    const partPayload = await readApiPayload<{ partNumber?: number; etag?: string; error?: string }>(partResponse);

    if (!partResponse.ok || !partPayload.partNumber || !partPayload.etag) {
      throw new Error(partPayload.error || `Falha ao enviar parte ${partNumber} de ${kind}.`);
    }

    parts.push({ partNumber: partPayload.partNumber, etag: partPayload.etag });
  }

  onProgress?.("Finalizando upload...");

  const completeResponse = await fetch("/api/meetings/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "complete",
      uploadId: initPayload.uploadId,
      objectKey: initPayload.objectKey,
      originalName: file.name,
      fileSize: file.size,
      parts,
    }),
  });

  const completePayload = await readApiPayload<{
    storageKey?: string;
    originalName?: string;
    size?: number;
    error?: string;
  }>(completeResponse);

  if (!completeResponse.ok || !completePayload.storageKey || !completePayload.originalName || !completePayload.size) {
    throw new Error(completePayload.error || `Falha ao finalizar upload de ${kind}.`);
  }

  return {
    storageKey: completePayload.storageKey,
    originalName: completePayload.originalName,
    size: completePayload.size,
  };
}

async function uploadMeetingFile(
  file: File,
  kind: UploadKind,
  onProgress?: (message: string) => void,
): Promise<UploadResult> {
  if (file.size <= SERVER_UPLOAD_MAX_BYTES) {
    try {
      return await uploadFileViaServer(file, kind);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SERVER_TOO_LARGE") {
        throw error;
      }
    }
  }

  return uploadFileViaMultipart(file, kind, onProgress);
}

export function MeetingCreateForm({
  clients,
  defaultLanguage,
}: {
  clients: ClientOption[];
  defaultLanguage: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUploadStatus(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;

    if (submitter?.name === "startProcessing") {
      formData.set("startProcessing", submitter.value);
    }

    startTransition(async () => {
      try {
        for (const { kind, field, label } of uploadFields) {
          const file = formData.get(field);
          if (!(file instanceof File) || file.size === 0) {
            continue;
          }

          const sizeMb = Math.max(1, Math.round(file.size / (1024 * 1024)));
          setUploadStatus(`Enviando ${label} (${sizeMb} MB)...`);

          const uploaded = await uploadMeetingFile(file, kind, (message) => {
            setUploadStatus(`Enviando ${label} (${sizeMb} MB) — ${message}`);
          });

          formData.delete(field);
          formData.set(`${kind}StorageKey`, uploaded.storageKey);
          formData.set(`${kind}OriginalName`, uploaded.originalName);
          formData.set(`${kind}Size`, String(uploaded.size));
        }

        setUploadStatus("Salvando reuniao...");
        await createMeetingAction(formData);
      } catch (submitError) {
        setUploadStatus(null);
        setError(submitError instanceof Error ? submitError.message : "Falha ao criar reuniao.");
      }
    });
  }

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {uploadStatus ? (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {uploadStatus}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="glass-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Titulo</span>
              <input className="form-input" name="title" placeholder="Titulo da reuniao" required disabled={isPending} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Cliente</span>
              <select className="form-select" name="clientId" defaultValue="" disabled={isPending}>
                <option value="">Cliente opcional</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Data e hora</span>
              <input className="form-input" name="meetingDate" type="datetime-local" required disabled={isPending} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Plataforma</span>
              <select className="form-select" name="platform" defaultValue="Google Meet" disabled={isPending}>
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Presencial">Presencial</option>
                <option value="Outra">Outra</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Idioma</span>
              <select className="form-select" name="language" defaultValue={defaultLanguage} disabled={isPending}>
                <option value="pt-BR">pt-BR</option>
                <option value="en-US">en-US</option>
                <option value="es-ES">es-ES</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Origem</span>
              <select className="form-select" name="sourceType" defaultValue="upload" disabled={isPending}>
                <option value="upload">Upload</option>
                <option value="transcript_import">Importar transcricao</option>
                <option value="manual">Manual</option>
                <option value="google_meet">Google Meet</option>
                <option value="chrome_extension">Chrome extension</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">URL da reuniao (opcional)</span>
            <input className="form-input" name="meetingUrl" placeholder="https://meet.google.com/..." disabled={isPending} />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="upload-zone">
              Upload de audio
              <p className="upload-zone-hint">MP3, WAV, M4A — ate 25 MB</p>
              <input className="mt-3 block w-full" name="audioFile" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm" disabled={isPending} />
            </label>
            <label className="upload-zone">
              Upload de video
              <p className="upload-zone-hint">MP4, WebM — ate 100 MB</p>
              <input className="mt-3 block w-full" name="videoFile" type="file" accept="video/*,.mp4,.mov,.m4v,.webm" disabled={isPending} />
            </label>
          </div>

          <label className="upload-zone mt-4">
            Importar arquivo .txt
            <p className="upload-zone-hint">Transcricao exportada de outra ferramenta</p>
            <input className="mt-3 block w-full" name="transcriptFile" type="file" accept=".txt,text/plain" disabled={isPending} />
          </label>

          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Transcricao manual</span>
            <textarea className="form-textarea" name="transcriptText" placeholder="Cole a transcricao manualmente aqui, se preferir." disabled={isPending} />
          </label>
        </section>

        <section className="space-y-6">
          <div className="glass-card p-6">
            <p className="panel-title">Participantes</p>
            <p className="mt-2 text-sm text-muted-foreground">Um participante por linha. Use esse bloco para enriquecer a ata e o follow-up.</p>
            <textarea className="form-textarea mt-4" name="participantsText" placeholder={"Ana Souza\nCarlos Lima\nTime do cliente"} disabled={isPending} />
          </div>

          <div className="glass-card p-6">
            <label className="flex gap-3 text-sm text-foreground">
              <input className="mt-0.5" name="consentConfirmed" type="checkbox" required disabled={isPending} />
              Confirmo que tenho autorizacao para registrar/transcrever esta reuniao.
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="btn-secondary" type="submit" disabled={isPending}>
                {isPending ? "Enviando..." : "Salvar rascunho"}
              </button>
              <button className="btn-primary" name="startProcessing" value="1" type="submit" disabled={isPending}>
                {isPending ? "Enviando..." : "Iniciar processamento"}
              </button>
            </div>
          </div>
        </section>
      </form>
    </>
  );
}
