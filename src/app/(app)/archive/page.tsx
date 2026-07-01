import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MessageBanner } from "@/components/message-banner";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const meetings = await prisma.meeting.findMany({
    where: { userId: user.id, status: "archived" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <SectionHeader
        eyebrow="Arquivo"
        title="Reunioes arquivadas"
        description="Historico de reunioes removidas da lista principal, sem perder contexto nem logs."
      />
      <MessageBanner message={params.success} tone="success" />
      {meetings.length ? (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="glass-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{meeting.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatDate(meeting.meetingDate)} • {meeting.platform}</p>
                </div>
                <StatusBadge status={meeting.status} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Arquivo vazio" description="Arquive reunioes para tirá-las da listagem principal sem perder o historico." />
      )}
    </>
  );
}
