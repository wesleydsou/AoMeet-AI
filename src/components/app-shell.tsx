import { DesktopSidebar, MobileNav } from "@/components/app-sidebar";
import { FadeIn } from "@/components/motion/fade-in";
import { getPlanLimits, getOrCreateUsage } from "@/lib/usage";

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

  const sidebarProps = {
    pathname,
    user: { name: user.name, email: user.email, plan: user.plan },
    usage: { meetingsUsed: usage.meetingsUsed, aiCreditsUsed: usage.aiCreditsUsed },
    limits: { meetings: limits.meetings, aiCredits: limits.aiCredits },
  };

  return (
    <div className="min-h-screen">
      <MobileNav {...sidebarProps} />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-8 px-4 py-6 lg:px-8">
        <DesktopSidebar {...sidebarProps} />
        <FadeIn className="min-w-0 flex-1 pb-8">
          <main>{children}</main>
        </FadeIn>
      </div>
    </div>
  );
}
