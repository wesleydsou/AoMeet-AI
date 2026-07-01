"use client";

import { useState, useTransition } from "react";
import { createMeetingAction } from "@/lib/actions/meeting-actions";
import type { UploadKind } from "@/lib/services/storage";

type ClientOption = { id: string; companyName: string };

const uploadFields: Array<{ kind: UploadKind; field: string; label: string }> = [
  { kind: "audio", field: "audioFile", label: "audio" },
  { kind: "video", field: "videoFile", label: "video" },
  { kind: "transcript", field: "transcriptFile", label: "transcricao" },
];

async function uploadFileDirectly(file: File, kind: UploadKind) {
  const prep = await fetch("/api/meetings/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });

  const payload = (await prep.json()) as {
    useDirect?: boolean;
    uploadUrl?: string;
    storageKey?: string;
    error?: string;
  };

  if (!prep.ok) {
    throw new Error(payload.error || `Falha ao preparar upload de ${kind}.`);
  }

  if (payload.useDirect) {
    return null;
  }

  if (!payload.uploadUrl || !payload.storageKey) {
    throw new Error(`Resposta invalida ao preparar upload de ${kind}.`);
  }

  const put = await fetch(payload.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });

  if (!put.ok) {
    throw new Error(`Falha ao enviar ${kind} para o storage (${put.status}).`);
  }

  return {
    storageKey: payload.storageKey,
    originalName: file.name,
    size: file.size,
  };
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

          setUploadStatus(`Enviando ${label} (${Math.round(file.size / (1024 * 1024))} MB)...`);
          const uploaded = await uploadFileDirectly(file, kind);

          if (uploaded) {
            formData.delete(field);
            formData.set(`${kind}StorageKey`, uploaded.storageKey);
            formData.set(`${kind}OriginalName`, uploaded.originalName);
            formData.set(`${kind}Size`, String(uploaded.size));
          }
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
