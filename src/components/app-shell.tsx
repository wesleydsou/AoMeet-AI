import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth-actions";
import { sidebarItems } from "@/lib/constants";
import { getPlanLimits, getOrCreateUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export async function AppShell({
  pathname,
  user,
  children,
}: {
  pathname: string;
  user: { id: string; name: string; email: string; plan: "FREE" | "PRO" | "BUSINESS" | "PREMIUM" };
  children: React.ReactNode;
}) {
  const usage = await getOrCreateUsage(user.id);
  const limits = getPlanLimits(user.plan);

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6">
        <aside className="glass-card hidden w-[310px] flex-col rounded-[32px] p-6 lg:flex">
          <Logo />
          <div className="mt-8 space-y-2">
            {sidebarItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-[rgba(14,95,148,0.12)] text-[var(--primary)]"
                      : "text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]",
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 rounded-[28px] bg-[linear-gradient(180deg,rgba(14,95,148,0.95),rgba(21,182,214,0.92))] p-5 text-white shadow-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-white/80">Uso mensal</p>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Reunioes</span>
                  <span>
                    {usage.meetingsUsed}/{limits.meetings === 9999 ? "Ilimitado" : limits.meetings}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/20">
                  <div className="h-2 rounded-full bg-white" style={{ width: `${Math.min((usage.meetingsUsed / limits.meetings) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Creditos IA</span>
                  <span>
                    {usage.aiCreditsUsed}/{limits.aiCredits === 9999 ? "Ilimitado" : limits.aiCredits}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/20">
                  <div className="h-2 rounded-full bg-[#d4fbff]" style={{ width: `${Math.min((usage.aiCreditsUsed / limits.aiCredits) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
            <Link href="/usage" className="btn-ghost mt-5 w-full text-sm !bg-white !text-[var(--primary)]">
              Upgrade
            </Link>
          </div>

          <div className="mt-auto rounded-[28px] border border-[var(--border)] bg-white/80 p-5">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Plano atual</p>
            <p className="mt-1 text-sm font-semibold text-[var(--primary)]">{user.plan}</p>
            <form action={logoutAction} className="mt-4">
              <button className="btn-secondary w-full" type="submit">
                Sair
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between rounded-[28px] border border-[var(--border)] bg-white/75 px-5 py-4 shadow-sm backdrop-blur lg:hidden">
            <Logo />
            <form action={logoutAction}>
              <button className="btn-secondary text-sm" type="submit">
                Sair
              </button>
            </form>
          </div>
          <main className="page-enter flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
