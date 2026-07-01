import { Badge } from "@/components/ui/badge";
import { MessageBanner } from "@/components/message-banner";
import { SectionHeader } from "@/components/section-header";
import { resetUserUsageAdminAction, updateUserAdminAction } from "@/lib/actions/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { getPlanLimits } from "@/lib/usage";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const month = monthKey();

  const [usersWithUsage, totalMeetings, totalClients] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        usageRecords: { where: { month }, take: 1 },
        _count: { select: { meetings: true, clients: true } },
      },
    }),
    prisma.meeting.count(),
    prisma.client.count(),
  ]);

  return (
    <>
      <SectionHeader
        eyebrow="Administracao"
        title="Painel master"
        description="Gerencie usuarios, planos, roles e consumo da plataforma AoMeet AI."
      />
      <MessageBanner message={params.error} tone="error" />
      <MessageBanner message={params.success} tone="success" />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Usuarios</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{usersWithUsage.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reunioes totais</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{totalMeetings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clientes B2B</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{totalClients}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios da plataforma</CardTitle>
          <CardDescription>Altere plano, role e reinicie o uso mensal de qualquer conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usersWithUsage.map((user) => {
            const usage = user.usageRecords[0];
            const limits = getPlanLimits(user.plan);

            return (
              <div key={user.id} className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge>{user.plan}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {user._count.meetings} reunioes · {user._count.clients} clientes · Uso:{" "}
                      {usage?.meetingsUsed ?? 0}/{limits.meetings === 9999 ? "∞" : limits.meetings} reunioes,{" "}
                      {usage?.aiCreditsUsed ?? 0}/{limits.aiCredits === 9999 ? "∞" : limits.aiCredits} creditos IA
                    </p>
                  </div>
                </div>

                <form action={updateUserAdminAction} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Plano</span>
                    <select className="form-select min-w-36" name="plan" defaultValue={user.plan}>
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="BUSINESS">BUSINESS</option>
                      <option value="PREMIUM">PREMIUM</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Role</span>
                    <select className="form-select min-w-32" name="role" defaultValue={user.role}>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                  <Button type="submit" size="sm">
                    Salvar
                  </Button>
                </form>

                <form action={resetUserUsageAdminAction} className="mt-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Zerar uso do mes
                  </Button>
                </form>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
