export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-card rounded-[32px] p-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}
