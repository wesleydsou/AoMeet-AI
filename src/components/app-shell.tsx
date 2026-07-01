import { DesktopSidebar, MobileNav } from "@/components/app-sidebar";
import { FadeIn } from "@/components/motion/fade-in";
import { isAdminUser } from "@/lib/admin";
import { getPlanLimits, getOrCreateUsage } from "@/lib/usage";

export async function AppShell({
  pathname,
  user,
  children,
}: {
  pathname: string;
  user: {
    id: string;
    name: string;
    email: string;
    plan: "FREE" | "PRO" | "BUSINESS" | "PREMIUM";
    role: "ADMIN" | "USER";
  };
  children: React.ReactNode;
}) {
  const usage = await getOrCreateUsage(user.id);
  const limits = getPlanLimits(user.plan);
  const isAdmin = isAdminUser(user);

  const sidebarProps = {
    pathname,
    isAdmin,
    user: { name: user.name, email: user.email, plan: user.plan },
    usage: { meetingsUsed: usage.meetingsUsed, aiCreditsUsed: usage.aiCreditsUsed },
    limits: { meetings: limits.meetings, aiCredits: limits.aiCredits },
  };

  return (
    <div className="min-h-screen lg:flex">
      <DesktopSidebar {...sidebarProps} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <MobileNav {...sidebarProps} />
        <FadeIn className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <main className="w-full">{children}</main>
        </FadeIn>
      </div>
    </div>
  );
}
