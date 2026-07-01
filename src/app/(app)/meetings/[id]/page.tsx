import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { EmptyState } from "@/components/empty-state";
import { MessageBanner } from "@/components/message-banner";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import {
  archiveMeetingAction,
  askAiAction,
  reprocessMeetingAction,
  shareMeetingAction,
  updateTaskAction,
} from "@/lib/actions/meeting-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoredFileLabel } from "@/lib/services/storage";
import { buildMinutesMarkdown, formatDateTime, formatDuration } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Visao geral" },
  { id: "transcript", label: "Transcricao" },
  { id: "summary", label: "Resumo" },
  { id: "decisions", label: "Decisoes" },
  { id: "tasks", label: "Tarefas" },
  { id: "chat", label: "Pergunte a IA" },
  { id: "files", label: "Arquivos" },
  { id: "logs", label: "Logs" },
];

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const activeTab = query.tab || "overview";

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: {
      client: true,
      participants: true,
      transcriptSegments: true,
      tasks: { orderBy: { createdAt: "asc" } },
      processingLogs: { orderBy: { createdAt: "asc" } },
      aiRequests: { where: { type: "chat" }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!meeting) {
    notFound();
  }

  const minutesMarkdown = buildMinutesMarkdown({
    title: meeting.title,
    summary: meeting.summaryText || "",
    participants: meeting.participants.map((item) => item.name),
    highlights: (meeting.summaryText || "").split(". ").filter(Boolean).slice(0, 3),
    decisions: meeting.decisionsText?.split("\n").filter(Boolean) || [],
    tasks: meeting.tasks.map((task) => ({
      title: task.title,
      responsible: task.responsibleName,
      dueDate: task.dueDate ? formatDateTime(task.dueDate) : null,
      status: task.status,
    })),
    risks: meeting.risksText?.split(". ").filter(Boolean) || [],
    nextSteps: meeting.nextStepsText?.split(". ").filter(Boolean) || [],
    followUp: meeting.followUpText || "",
  });

  const audioLabel = getStoredFileLabel(meeting.audioStorageKey, meeting.audioOriginalName);
  const videoLabel = getStoredFileLabel(meeting.videoStorageKey, meeting.videoOriginalName);
  const transcriptLabel = getStoredFileLabel(meeting.transcriptImportStorageKey, meeting.transcriptOriginalName);
  const isProcessing = meeting.status === "queued" || meeting.status === "transcribing" || meeting.status === "summarizing";

  return (
    <>
      <SectionHeader
        eyebrow="Detalhe"
        title={meeting.title}
        description={`${meeting.platform} • ${formatDateTime(meeting.meetingDate)} • ${meeting.client?.companyName || "Sem cliente vinculado"}`}
        action={
          <>
            <CopyMarkdownButton content={minutesMarkdown} />
            <Link href={`/api/meetings/${meeting.id}/markdown`} className="btn-secondary">
              Exportar Markdown
            </Link>
            <form action={reprocessMeetingAction}>
              <input name="meetingId" type="hidden" value={meeting.id} />
              <button className="btn-secondary" type="submit">
                Reprocessar
              </button>
            </form>
            <form action={archiveMeetingAction}>
              <input name="meetingId" type="hidden" value={meeting.id} />
              <button className="btn-danger" type="submit">
                Arquivar
              </button>
            </form>
          </>
        }
      />
      <MessageBanner message={query.error} tone="error" />
      <MessageBanner message={query.success} tone="success" />

      {isProcessing ? (
        <MessageBanner message="Processamento em andamento. Atualize a pagina em alguns instantes." tone="success" />
      ) : null}

      {meeting.status === "failed" && meeting.processingError ? (
        <MessageBanner message={meeting.processingError} tone="error" />
      ) : null}

      <section className="glass-card rounded-[32px] p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={meeting.status} />
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm text-[var(--muted)]">{meeting.participantCount} participantes</span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm text-[var(--muted)]">{formatDuration(meeting.durationSeconds)}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm text-[var(--muted)]">{meeting.language}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/meetings/${meeting.id}?tab=${tab.id}`}
              className={`rounded-full px-4 py-2 text-sm font-bold ${activeTab === tab.id ? "bg-[var(--primary)] text-white" : "bg-white/80 text-[var(--muted)]"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6">
        {activeTab === "overview" ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <section className="glass-card rounded-[32px] p-6">
              <p className="text-lg font-black">Resumo executivo</p>
              <p className="prose-output mt-4 text-sm text-[var(--muted)]">{meeting.summaryText || "A reuniao ainda nao foi processada."}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[var(--border)] bg-white/75 p-4">
                  <p className="text-sm font-bold">Proximos passos</p>
                  <p className="prose-output mt-2 text-sm text-[var(--muted)]">{meeting.nextStepsText || "Ainda nao disponivel."}</p>
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-white/75 p-4">
                  <p className="text-sm font-bold">Riscos e pontos de atencao</p>
                  <p className="prose-output mt-2 text-sm text-[var(--muted)]">{meeting.risksText || "Ainda nao disponivel."}</p>
                </div>
              </div>
            </section>
            <section className="glass-card rounded-[32px] p-6">
              <p className="text-lg font-black">Contexto da reuniao</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                <div className="rounded-[24px] bg-white/75 p-4">Participantes: {meeting.participants.map((item) => item.name).join(", ") || "Nao informado"}</div>
                <div className="rounded-[24px] bg-white/75 p-4">URL: {meeting.meetingUrl || "Nao informada"}</div>
                <div className="rounded-[24px] bg-white/75 p-4">Consentimento registrado: {meeting.consentConfirmed ? "Sim" : "Nao"}</div>
              </div>
              <form action={shareMeetingAction} className="mt-6 space-y-3">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <p className="text-sm font-bold">Compartilhar reuniao</p>
                <input className="form-input" name="email" placeholder="email@empresa.com" type="email" />
                <select className="form-select" name="permission" defaultValue="view">
                  <option value="view">Visualizar</option>
                  <option value="comment">Comentar</option>
                  <option value="edit">Editar</option>
                </select>
                <button className="btn-secondary" type="submit">
                  Compartilhar
                </button>
              </form>
            </section>
          </div>
        ) : null}

        {activeTab === "transcript" ? (
          <section className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Transcricao</p>
            <p className="prose-output mt-4 text-sm text-[var(--muted)]">{meeting.transcriptText || "Sem transcricao disponivel."}</p>
            {meeting.transcriptSegments.length ? (
              <div className="mt-6 space-y-3">
                {meeting.transcriptSegments.map((segment) => (
                  <div key={segment.id} className="rounded-[24px] border border-[var(--border)] bg-white/75 p-4">
                    <p className="text-sm font-bold">
                      {segment.speakerName} • {segment.startTimeSeconds}s - {segment.endTimeSeconds}s
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{segment.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "summary" ? (
          <section className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Ata inteligente</p>
            <pre className="prose-output mt-4 overflow-x-auto rounded-[24px] bg-[#0f1d2a] p-5 text-sm text-slate-100">{minutesMarkdown}</pre>
          </section>
        ) : null}

        {activeTab === "decisions" ? (
          <section className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Decisoes tomadas</p>
            <div className="mt-4 space-y-3">
              {(meeting.decisionsText?.split("\n").filter(Boolean) || []).map((decision) => (
                <div key={decision} className="rounded-[24px] border border-[var(--border)] bg-white/75 p-4 text-sm text-[var(--muted)]">
                  {decision}
                </div>
              ))}
              {!meeting.decisionsText ? <EmptyState title="Sem decisoes ainda" description="Processe a reuniao para preencher este bloco automaticamente." /> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "tasks" ? (
          <section className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Tarefas e responsaveis</p>
            <div className="mt-5 space-y-4">
              {meeting.tasks.length ? (
                meeting.tasks.map((task) => (
                  <form key={task.id} action={updateTaskAction} className="rounded-[24px] border border-[var(--border)] bg-white/80 p-4">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <p className="font-bold">{task.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{task.description || "Sem descricao adicional."}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <input className="form-input" name="responsibleName" defaultValue={task.responsibleName || ""} placeholder="Responsavel" />
                      <input className="form-input" name="dueDate" type="date" defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""} />
                      <select className="form-select" name="status" defaultValue={task.status}>
                        <option value="pending">pending</option>
                        <option value="in_progress">in_progress</option>
                        <option value="completed">completed</option>
                      </select>
                    </div>
                    <button className="btn-secondary mt-4" type="submit">
                      Atualizar tarefa
                    </button>
                  </form>
                ))
              ) : (
                <EmptyState title="Sem tarefas geradas" description="As tarefas extraidas pela IA vao aparecer aqui apos o processamento." />
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "chat" ? (
          <section className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Pergunte a IA</p>
            <form action={askAiAction} className="mt-4 flex flex-col gap-3 md:flex-row">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input className="form-input flex-1" name="question" placeholder="Quais foram os compromissos assumidos nesta reuniao?" />
              <button className="btn-primary" type="submit">
                Enviar
              </button>
            </form>
            <div className="mt-6 space-y-4">
              {meeting.aiRequests.length ? (
                meeting.aiRequests.map((request) => (
                  <div key={request.id} className="rounded-[24px] border border-[var(--border)] bg-white/80 p-4">
                    <p className="text-sm font-bold text-[var(--primary)]">{request.prompt}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{request.response}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="Sem perguntas ainda" description="Use esse bloco para explorar o contexto da reuniao com base na transcricao." />
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "files" ? (
          <section className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Arquivos privados</p>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <div className="rounded-[24px] bg-white/80 p-4">
                Audio: {audioLabel || "Nao enviado"}
                {audioLabel ? (
                  <Link href={`/api/meetings/${meeting.id}/files?type=audio`} className="ml-3 text-[var(--primary)]">
                    Baixar
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[24px] bg-white/80 p-4">
                Video: {videoLabel || "Nao enviado"}
                {videoLabel ? (
                  <Link href={`/api/meetings/${meeting.id}/files?type=video`} className="ml-3 text-[var(--primary)]">
                    Baixar
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[24px] bg-white/80 p-4">
                Transcricao importada: {transcriptLabel || "Nao enviado"}
                {transcriptLabel ? (
                  <Link href={`/api/meetings/${meeting.id}/files?type=transcript`} className="ml-3 text-[var(--primary)]">
                    Baixar
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "logs" ? (
          <section className="glass-card rounded-[32px] p-6">
            <p className="text-lg font-black">Logs de processamento</p>
            <div className="mt-4 space-y-3">
              {meeting.processingLogs.length ? (
                meeting.processingLogs.map((log) => (
                  <div key={log.id} className="rounded-[24px] border border-[var(--border)] bg-white/80 p-4">
                    <p className="text-sm font-bold">
                      {log.step} • {log.status}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{log.message}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="Sem logs ainda" description="Os logs vao aparecer conforme a reuniao for processada." />
              )}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
