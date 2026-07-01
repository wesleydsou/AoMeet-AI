export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0e5f94_0%,#15b6d6_100%)] text-lg font-black text-white shadow-lg">
        AO
      </div>
      <div>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--primary)]">AoMeet AI</p>
        <p className="text-xs text-[var(--muted)]">Atas, transcricoes e tarefas automaticas</p>
      </div>
    </div>
  );
}
