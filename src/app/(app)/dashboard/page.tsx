import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getOrCreateUsage } from "@/lib/usage";
import { formatDate, relativeTime } from "@/lib/utils";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { DashboardStats } from "@/components/dashboard-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      where: { userId: user.id, status: { in: ["draft", "queued", "uploaded", "transcribing", "summarizing"] } },
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

  const stats = [
    { label: "Total de reunioes", value: totalMeetings, icon: Calendar },
    { label: "Este mes", value: currentMonthMeetings, icon: BarChart3 },
    { label: "Creditos IA", value: usage.aiCreditsUsed, icon: Sparkles },
    { label: "Processadas", value: processedCount, icon: CheckCircle2 },
    { label: "Pendentes", value: pendingCount, icon: Clock },
    { label: "Tarefas geradas", value: tasksCount, icon: ArrowRight },
  ];

  return (
    <>
      <SectionHeader
        eyebrow="Dashboard"
        title={`Ola, ${user.name.split(" ")[0]}`}
        description="Acompanhe reunioes, consumo do plano e resultados gerados pela IA."
        action={
          <>
            <Button asChild>
              <Link href="/meetings/new">Nova reuniao</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/reports">Relatorios</Link>
            </Button>
          </>
        }
      />

      <DashboardStats stats={stats} />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Ultimas reunioes</CardTitle>
              <CardDescription>Acesso rapido ao detalhe e status do processamento.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/meetings">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {meetings.length ? (
              meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-primary">{meeting.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(meeting.meetingDate)} · {meeting.platform} · {relativeTime(meeting.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={meeting.status} />
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma reuniao ainda.{" "}
                <Link href="/meetings/new" className="font-medium text-primary hover:underline">
                  Criar primeira reuniao
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Proximos passos</CardTitle>
            <CardDescription>Comece por aqui para extrair valor do AoMeet AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Envie audio ou video de uma reuniao recente.",
              "Processe para gerar ata, tarefas e decisoes.",
              "Configure o token da extensao em Configuracoes.",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
