"use client";

import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statIconMap: Record<string, LucideIcon> = {
  calendar: Calendar,
  "bar-chart": BarChart3,
  sparkles: Sparkles,
  "check-circle": CheckCircle2,
  clock: Clock,
  "arrow-right": ArrowRight,
};

export function DashboardStats({
  stats,
}: {
  stats: Array<{ label: string; value: number; icon: string }>;
}) {
  return (
    <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map(({ label, value, icon }) => {
        const Icon = statIconMap[icon] ?? Calendar;

        return (
          <StaggerItem key={label}>
            <Card className="bg-card shadow-sm transition-colors hover:border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="size-4 text-primary/70" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">{String(value).padStart(2, "0")}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}
