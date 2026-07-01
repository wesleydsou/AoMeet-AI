import Link from "next/link";
import { Logo } from "@/components/logo";
import { MessageBanner } from "@/components/message-banner";

export function AuthCard({
  title,
  description,
  action,
  alternate,
  error,
  children,
}: {
  title: string;
  description: string;
  action: string;
  alternate: { href: string; label: string; prompt: string };
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-6">
      <section className="flex flex-col justify-between rounded-[40px] border border-[var(--border)] bg-[linear-gradient(160deg,rgba(14,95,148,0.98),rgba(21,182,214,0.9))] p-8 text-white shadow-[0_30px_80px_rgba(14,95,148,0.25)] md:p-12">
        <Logo />
        <div className="py-10">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-white/70">Aosafe Cloud Solutions</p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight md:text-5xl">
            Atas inteligentes, transcricoes e tarefas automaticas para reunioes B2B.
          </h1>
          <p className="mt-5 max-w-lg text-base text-white/80">
            O MVP do AoMeet AI ja nasce preparado para autenticar usuarios, receber arquivos privados, processar conteudo e abrir caminho para a futura extensao do Google Meet.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {["Dashboard limpo", "Resumo e tarefas mockados", "APIs para extensao"].map((item) => (
            <div key={item} className="rounded-[24px] bg-white/10 p-4 text-sm font-semibold backdrop-blur">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-[40px] p-8 md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">{action}</p>
        <h2 className="mt-3 text-3xl font-black">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        <MessageBanner message={error} tone="error" />
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          {alternate.prompt}{" "}
          <Link href={alternate.href} className="font-bold text-[var(--primary)]">
            {alternate.label}
          </Link>
        </p>
      </section>
    </div>
  );
}
