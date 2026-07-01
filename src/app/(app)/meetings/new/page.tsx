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

      <form action={createMeetingAction} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card rounded-[32px] p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input className="form-input" name="title" placeholder="Titulo da reuniao" />
            <select className="form-select" name="clientId" defaultValue="">
              <option value="">Cliente opcional</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
            <input className="form-input" name="meetingDate" type="datetime-local" />
            <select className="form-select" name="platform" defaultValue="Google Meet">
              {meetingPlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
            <select className="form-select" name="language" defaultValue={user.defaultLanguage}>
              {meetingLanguages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <select className="form-select" name="sourceType" defaultValue="upload">
              <option value="upload">Upload</option>
              <option value="transcript_import">Importar transcricao</option>
              <option value="manual">Manual</option>
              <option value="google_meet">Google Meet</option>
              <option value="chrome_extension">Chrome extension</option>
            </select>
          </div>

          <input className="form-input mt-4" name="meetingUrl" placeholder="URL da reuniao (opcional)" />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/60 p-4 text-sm text-[var(--muted)]">
              Upload de audio
              <input className="mt-3 block w-full text-sm" name="audioFile" type="file" accept="audio/*" />
            </label>
            <label className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/60 p-4 text-sm text-[var(--muted)]">
              Upload de video
              <input className="mt-3 block w-full text-sm" name="videoFile" type="file" accept="video/*" />
            </label>
          </div>

          <label className="mt-4 block rounded-[24px] border border-dashed border-[var(--border)] bg-white/60 p-4 text-sm text-[var(--muted)]">
            Importar arquivo .txt
            <input className="mt-3 block w-full text-sm" name="transcriptFile" type="file" accept=".txt,text/plain" />
          </label>

          <textarea className="form-textarea mt-4" name="transcriptText" placeholder="Cole a transcricao manualmente aqui, se preferir." />
        </section>

        <section className="space-y-6">
          <div className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Participantes</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Um participante por linha. Use esse bloco para enriquecer a ata e o follow-up.</p>
            <textarea className="form-textarea mt-4" name="participantsText" placeholder={"Ana Souza\nCarlos Lima\nTime do cliente"} />
          </div>

          <div className="glass-card rounded-[32px] p-6">
            <label className="flex gap-3 text-sm text-[var(--muted)]">
              <input name="consentConfirmed" type="checkbox" />
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
