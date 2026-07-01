import { MessageBanner } from "@/components/message-banner";
import { SectionHeader } from "@/components/section-header";
import { createClientAction } from "@/lib/actions/client-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <SectionHeader
        eyebrow="Clientes"
        title="Base de clientes"
        description="Cadastre contatos e empresas para vincular reunioes, relatorios e futuros fluxos comerciais."
      />
      <MessageBanner message={params.error} tone="error" />
      <MessageBanner message={params.success} tone="success" />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form action={createClientAction} className="glass-card p-6">
          <p className="panel-title">Novo cliente</p>
          <div className="mt-4 space-y-3">
            <input className="form-input" name="name" placeholder="Nome do contato" />
            <input className="form-input" name="companyName" placeholder="Empresa" />
            <input className="form-input" name="email" type="email" placeholder="E-mail" />
            <input className="form-input" name="phone" placeholder="Telefone" />
          </div>
          <button className="btn-primary mt-5" type="submit">
            Criar cliente
          </button>
        </form>

        <section className="glass-card p-6">
          <p className="panel-title">Clientes cadastrados</p>
          <div className="mt-5 space-y-4">
            {clients.length ? (
              clients.map((client) => (
                <div key={client.id} className="rounded-lg border border-border bg-muted/50 p-4">
                  <p className="font-semibold text-foreground">{client.companyName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{client.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
