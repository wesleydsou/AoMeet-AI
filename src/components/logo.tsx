import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
        <Sparkles className="size-5 text-primary-foreground" />
        <div className="absolute inset-0 rounded-xl bg-linear-to-br from-white/20 to-transparent" />
      </div>
      {!compact ? (
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">AoMeet AI</p>
          <p className="text-xs text-muted-foreground">Reunioes inteligentes</p>
        </div>
      ) : null}
    </div>
  );
}
