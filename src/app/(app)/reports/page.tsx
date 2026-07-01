import Link from "next/link";
import { MeetingStatus, Prisma } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { meetingPlatforms, meetingStatuses } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDuration } from "@/lib/utils";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const selectedStatus =
    params.status && params.status !== "all" && meetingStatuses.includes(params.status as (typeof meetingStatuses)[number])
      ? (params.status as MeetingStatus)
      : undefined;

  const where: Prisma.MeetingWhereInput = {
    userId: user.id,
    title: params.search ? { contains: params.search } : undefined,
    platform: params.platform && params.platform !== "all" ? params.platform : undefined,
    status: selectedStatus,
    participantCount: params.participants ? Number(params.participants) : undefined,
    meetingDate:
      params.from || params.to
        ? {
            gte: params.from ? new Date(params.from) : undefined,
            lte: params.to ? new Date(params.to) : undefined,
          }
        : undefined,
  };

  const meetings = await prisma.meeting.findMany({
    where,
    orderBy: { meetingDate: "desc" },
  });

  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  return (
    <>
      <SectionHeader
        eyebrow="Relatorios"
        title="Relatorios operacionais"
        description="Filtre reunioes por titulo, participantes, plataforma e periodo para exportar um CSV pronto para operacao."
        action={<Link href={`/api/reports/export${query ? `?${query}` : ""}`} className="btn-primary">Exportar CSV</Link>}
      />

      <section className="glass-card p-6">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input className="form-input" name="search" defaultValue={params.search} placeholder="Pesquisar titulo" />
          <input className="form-input" name="participants" defaultValue={params.participants} placeholder="Numero de participantes" />
          <select className="form-select" name="platform" defaultValue={params.platform || "all"}>
            <option value="all">Todas as plataformas</option>
            {meetingPlatforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <select className="form-select" name="status" defaultValue={params.status || "all"}>
            <option value="all">Todos os status</option>
            {meetingStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input className="form-input" name="from" type="date" defaultValue={params.from} />
          <input className="form-input" name="to" type="date" defaultValue={params.to} />
          <button className="btn-primary xl:col-span-6" type="submit">
            Aplicar filtros
          </button>
        </form>
      </section>

      <section className="glass-card mt-6 overflow-hidden p-2">
        {meetings.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Iniciado em</th>
                <th>Titulo</th>
                <th>Duracao</th>
                <th>Participantes</th>
                <th>Plataforma</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td>{formatDate(meeting.meetingDate)}</td>
                  <td>
                    <p className="font-semibold">{meeting.title}</p>
                    <p className="text-sm text-muted-foreground">{meeting.participantsText || "Participantes nao detalhados"}</p>
                  </td>
                  <td>{formatDuration(meeting.durationSeconds)}</td>
                  <td>{meeting.participantCount}</td>
                  <td>{meeting.platform}</td>
                  <td><StatusBadge status={meeting.status} /></td>
                  <td>
                    <Link href={`/meetings/${meeting.id}`} className="font-bold text-primary">
                      Visualizar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Nenhum relatorio encontrado" description="Use os filtros acima ou gere novas reunioes para alimentar a tabela." />
        )}
      </section>
    </>
  );
}
