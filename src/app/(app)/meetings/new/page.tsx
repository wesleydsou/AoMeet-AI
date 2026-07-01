import Link from "next/link";
import { MessageBanner } from "@/components/message-banner";
import { SectionHeader } from "@/components/section-header";
import { createMeetingAction } from "@/lib/actions/meeting-actions";
import { requireUser } from "@/lib/auth";
import { meetingLanguages, meetingPlatforms } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { companyName: "asc" },
  });

  return (
    <>
      <SectionHeader
        eyebrow="Cadastro"
        title="Nova reuniao"
        description="Crie a reuniao, faça upload de audio ou video, importe uma transcricao ou cole o conteudo manualmente."
        action={<Link href="/clients" className="btn-secondary">Criar cliente</Link>}
      />
      <MessageBanner message={params.error} tone="error" />

      <form action={createMeetingAction} className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="glass-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Titulo</span>
              <input className="form-input" name="title" placeholder="Titulo da reuniao" required />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Cliente</span>
              <select className="form-select" name="clientId" defaultValue="">
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
              <input className="form-input" name="meetingDate" type="datetime-local" required />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Plataforma</span>
              <select className="form-select" name="platform" defaultValue="Google Meet">
                {meetingPlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Idioma</span>
              <select className="form-select" name="language" defaultValue={user.defaultLanguage}>
                {meetingLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Origem</span>
              <select className="form-select" name="sourceType" defaultValue="upload">
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
            <input className="form-input" name="meetingUrl" placeholder="https://meet.google.com/..." />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="upload-zone">
              Upload de audio
              <p className="upload-zone-hint">MP3, WAV, M4A ou similar</p>
              <input className="mt-3 block w-full" name="audioFile" type="file" accept="audio/*" />
            </label>
            <label className="upload-zone">
              Upload de video
              <p className="upload-zone-hint">MP4, WebM ou similar</p>
              <input className="mt-3 block w-full" name="videoFile" type="file" accept="video/*" />
            </label>
          </div>

          <label className="upload-zone mt-4">
            Importar arquivo .txt
            <p className="upload-zone-hint">Transcricao exportada de outra ferramenta</p>
            <input className="mt-3 block w-full" name="transcriptFile" type="file" accept=".txt,text/plain" />
          </label>

          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Transcricao manual</span>
            <textarea className="form-textarea" name="transcriptText" placeholder="Cole a transcricao manualmente aqui, se preferir." />
          </label>
        </section>

        <section className="space-y-6">
          <div className="glass-card p-6">
            <p className="panel-title">Participantes</p>
            <p className="mt-2 text-sm text-muted-foreground">Um participante por linha. Use esse bloco para enriquecer a ata e o follow-up.</p>
            <textarea className="form-textarea mt-4" name="participantsText" placeholder={"Ana Souza\nCarlos Lima\nTime do cliente"} />
          </div>

          <div className="glass-card p-6">
            <label className="flex gap-3 text-sm text-foreground">
              <input className="mt-0.5" name="consentConfirmed" type="checkbox" required />
              Confirmo que tenho autorizacao para registrar/transcrever esta reuniao.
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="btn-secondary" type="submit">
                Salvar rascunho
              </button>
              <button className="btn-primary" name="startProcessing" value="1" type="submit">
                Iniciar processamento
              </button>
            </div>
          </div>
        </section>
      </form>
    </>
  );
}
