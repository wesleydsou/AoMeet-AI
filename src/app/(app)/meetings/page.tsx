import Link from "next/link";
import { MeetingStatus, Prisma } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { MessageBanner } from "@/components/message-banner";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { meetingPlatforms, meetingStatuses } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDuration } from "@/lib/utils";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const selectedStatus =
    params.status && params.status !== "all" && meetingStatuses.includes(params.status as (typeof meetingStatuses)[number])
      ? (params.status as MeetingStatus)
      : null;

  const where: Prisma.MeetingWhereInput = {
    userId: user.id,
    status: selectedStatus ?? { not: "archived" },
    platform: params.platform && params.platform !== "all" ? params.platform : undefined,
    clientId: params.clientId && params.clientId !== "all" ? params.clientId : undefined,
    title: params.search ? { contains: params.search } : undefined,
  };

  const [meetings, clients] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { userId: user.id },
      orderBy: { companyName: "asc" },
    }),
  ]);

  return (
    <>
      <SectionHeader
        eyebrow="Reunioes"
        title="Minhas reunioes"
        description="Pesquise, filtre e acompanhe todo o fluxo das reunioes processadas pelo AoMeet AI."
        action={
          <>
            <Link href="/meetings/new" className="btn-primary">
              Nova reuniao
            </Link>
            <Link href="/meetings/new" className="btn-secondary">
              Fazer upload
            </Link>
          </>
        }
      />
      <MessageBanner message={params.error} tone="error" />
      <MessageBanner message={params.success} tone="success" />

      <section className="glass-card rounded-[32px] p-6">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input className="form-input" name="search" defaultValue={params.search} placeholder="Buscar por palavra-chave" />
          <select className="form-select" name="status" defaultValue={params.status || "all"}>
            <option value="all">Todos os status</option>
            {meetingStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="form-select" name="platform" defaultValue={params.platform || "all"}>
            <option value="all">Todas as plataformas</option>
            {meetingPlatforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <select className="form-select" name="clientId" defaultValue={params.clientId || "all"}>
            <option value="all">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </select>
          <button className="btn-primary" type="submit">
            Filtrar
          </button>
        </form>
      </section>

      <section className="glass-card mt-6 overflow-hidden rounded-[32px] p-2">
        {meetings.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Data</th>
                <th>Plataforma</th>
                <th>Duracao</th>
                <th>Participantes</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td>
                    <p className="font-semibold">{meeting.title}</p>
                    <p className="text-sm text-[var(--muted)]">{meeting.client?.companyName || "Sem cliente"}</p>
                  </td>
                  <td>{formatDate(meeting.meetingDate)}</td>
                  <td>{meeting.platform}</td>
                  <td>{formatDuration(meeting.durationSeconds)}</td>
                  <td>{meeting.participantCount}</td>
                  <td>
                    <StatusBadge status={meeting.status} />
                  </td>
                  <td>
                    <Link href={`/meetings/${meeting.id}`} className="font-bold text-[var(--primary)]">
                      Visualizar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Nenhuma reuniao encontrada" description="Ajuste os filtros ou crie uma nova reuniao para alimentar o painel." />
        )}
      </section>
    </>
  );
}
