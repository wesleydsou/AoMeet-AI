import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const pathname = (await headers()).get("x-current-path") || "/dashboard";

  return (
    <AppShell
      pathname={pathname}
      user={{ id: user.id, name: user.name, email: user.email, plan: user.plan, role: user.role }}
    >
      {children}
    </AppShell>
  );
}
