import { SectionHeader } from "@/components/section-header";
import { requireUser } from "@/lib/auth";
import { getOrCreateUsage, getPlanLimits } from "@/lib/usage";

export default async function UsagePage() {
  const user = await requireUser();
  const usage = await getOrCreateUsage(user.id);
  const limits = getPlanLimits(user.plan);

  const cards = [
    { label: "Reunioes usadas", used: usage.meetingsUsed, limit: limits.meetings },
    { label: "Creditos IA usados", used: usage.aiCreditsUsed, limit: limits.aiCredits },
    { label: "Storage privado (bytes)", used: usage.storageUsed, limit: null },
  ];

  return (
    <>
      <SectionHeader
        eyebrow="Plano"
        title="Uso do plano"
        description="Acompanhe os limites mensais do MVP e use esse painel como base para billing futuro."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="glass-card p-6">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-4 text-4xl font-semibold text-foreground tabular-nums">
              {card.used}
              {card.limit ? <span className="text-base font-semibold text-muted-foreground"> / {card.limit === 9999 ? "Ilimitado" : card.limit}</span> : null}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
