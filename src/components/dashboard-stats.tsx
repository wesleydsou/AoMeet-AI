"use client";

import type { LucideIcon } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardStats({
  stats,
}: {
  stats: Array<{ label: string; value: number; icon: LucideIcon }>;
}) {
  return (
    <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <StaggerItem key={label}>
          <Card className="bg-card/80 transition-colors hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-primary/70" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{String(value).padStart(2, "0")}</p>
            </CardContent>
          </Card>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
