"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth-actions";
import { sidebarItems } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SidebarProps = {
  pathname: string;
  user: { name: string; email: string; plan: string };
  usage: { meetingsUsed: number; aiCreditsUsed: number };
  limits: { meetings: number; aiCredits: number };
};

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {sidebarItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link key={href} href={href} onClick={onNavigate}>
            <motion.div
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
              {label}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}

function UsageCard({ usage, limits }: Pick<SidebarProps, "usage" | "limits">) {
  const meetingsPct = limits.meetings === 9999 ? 8 : Math.min((usage.meetingsUsed / limits.meetings) * 100, 100);
  const creditsPct = limits.aiCredits === 9999 ? 8 : Math.min((usage.aiCreditsUsed / limits.aiCredits) * 100, 100);

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Uso do plano</p>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Reunioes</span>
            <span className="font-medium tabular-nums">
              {usage.meetingsUsed}/{limits.meetings === 9999 ? "∞" : limits.meetings}
            </span>
          </div>
          <Progress value={meetingsPct} className="h-1.5" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Creditos IA</span>
            <span className="font-medium tabular-nums">
              {usage.aiCreditsUsed}/{limits.aiCredits === 9999 ? "∞" : limits.aiCredits}
            </span>
          </div>
          <Progress value={creditsPct} className="h-1.5" />
        </div>
      </div>
      <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
        <Link href="/usage">Ver plano</Link>
      </Button>
    </div>
  );
}

function UserCard({ user }: Pick<SidebarProps, "user">) {
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-xl border border-sidebar-border bg-card/50 p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{user.plan}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
            <LogOut className="size-3.5" />
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}

export function DesktopSidebar(props: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 lg:flex">
      <Logo />
      <NavLinks pathname={props.pathname} />
      <UsageCard usage={props.usage} limits={props.limits} />
      <div className="mt-auto">
        <UserCard user={props.user} />
      </div>
    </aside>
  );
}

export function MobileNav(props: SidebarProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 backdrop-blur-md lg:hidden">
      <Logo compact />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Abrir menu">
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 border-sidebar-border bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border p-6 text-left">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Logo />
          </SheetHeader>
          <div className="flex flex-col gap-6 p-4">
            <NavLinks pathname={props.pathname} />
            <Separator />
            <UsageCard usage={props.usage} limits={props.limits} />
            <UserCard user={props.user} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
