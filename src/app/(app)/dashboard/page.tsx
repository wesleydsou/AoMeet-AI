import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getOrCreateUsage } from "@/lib/usage";
import { formatDate, relativeTime } from "@/lib/utils";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const user = await requireUser();
  const usage = await getOrCreateUsage(user.id);

  const [meetings, tasksCount, processedCount, totalMeetings, pendingCount] = await Promise.all([
    prisma.meeting.findMany({
      where: { userId: user.id, status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.meetingTask.count({
      where: { meeting: { userId: user.id } },
    }),
    prisma.meeting.count({
      where: { userId: user.id, status: "completed" },
    }),
    prisma.meeting.count({
      where: { userId: user.id, status: { not: "archived" } },
    }),
    prisma.meeting.count({
      where: { userId: user.id, status: { in: ["draft", "uploaded", "transcribing", "summarizing"] } },
    }),
  ]);

  const currentMonthMeetings = await prisma.meeting.count({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  const cards = [
    { label: "Total de reunioes", value: totalMeetings.toString().padStart(2, "0") },
    { label: "Reunioes este mes", value: currentMonthMeetings.toString().padStart(2, "0") },
    { label: "Creditos IA usados", value: usage.aiCreditsUsed.toString().padStart(2, "0") },
    { label: "Reunioes processadas", value: processedCount.toString().padStart(2, "0") },
    { label: "Reunioes pendentes", value: pendingCount.toString().padStart(2, "0") },
    { label: "Tarefas geradas", value: tasksCount.toString().padStart(2, "0") },
  ];

  return (
    <>
      <SectionHeader
        eyebrow="Visao Geral"
        title="Painel operacional do AoMeet AI"
        description="Acompanhe o ritmo das reunioes, o consumo mensal do plano e os resultados que a IA ja entregou para o time."
        action={
          <>
            <Link href="/meetings/new" className="btn-primary">
              Nova reuniao
            </Link>
            <Link href="/reports" className="btn-secondary">
              Ver relatorios
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className="glass-card rounded-[28px] p-6"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="mt-5 text-4xl font-black text-[var(--foreground)]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="glass-card rounded-[32px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-black">Ultimas reunioes</p>
              <p className="text-sm text-[var(--muted)]">Historico recente com acesso rapido ao detalhe.</p>
            </div>
            <Link href="/meetings" className="text-sm font-bold text-[var(--primary)]">
              Ver todas
            </Link>
          </div>

          <div className="space-y-4">
            {meetings.length ? (
              meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-lg md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-bold">{meeting.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {formatDate(meeting.meetingDate)} • {meeting.platform} • {relativeTime(meeting.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={meeting.status} />
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Nenhuma reuniao criada ainda. Comece pelo upload ou pela transcricao manual.</p>
            )}
          </div>
        </section>

        <section className="glass-card rounded-[32px] p-6">
          <p className="text-lg font-black">Checklist do MVP</p>
          <div className="mt-5 space-y-3 text-sm text-[var(--muted)]">
            {[
              "Autenticacao segura com rotas protegidas.",
              "Upload privado e fluxo mockado de transcricao.",
              "Resumo, decisoes, tarefas e chat com IA.",
              "APIs internas preparadas para extensao Chrome.",
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--border)] bg-white/75 p-4">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
