export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[32px] border border-[var(--border)] bg-white/80 p-6 shadow-sm backdrop-blur md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}
