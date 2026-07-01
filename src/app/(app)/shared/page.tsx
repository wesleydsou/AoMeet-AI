import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SharedPage() {
  const user = await requireUser();
  const shares = await prisma.meetingShare.findMany({
    where: { sharedWithEmail: user.email },
    include: { meeting: true },
  });

  return (
    <>
      <SectionHeader
        eyebrow="Compartilhado"
        title="Compartilhado comigo"
        description="Espaco preparado para listar reunioes compartilhadas no plano Business e Premium."
      />

      {shares.length ? (
        <div className="grid gap-4">
          {shares.map((share) => (
            <div key={share.id} className="glass-card p-6">
              <p className="text-lg font-semibold">{share.meeting.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">Permissao: {share.permission}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nada compartilhado ainda" description="Os compartilhamentos vao aparecer aqui quando esse fluxo estiver em uso." />
      )}
    </>
  );
}
