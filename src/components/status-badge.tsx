import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  queued: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  uploaded: "bg-chart-1/15 text-chart-1 border-chart-1/20",
  transcribing: "bg-primary/15 text-primary border-primary/20",
  summarizing: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  completed: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  archived: "bg-secondary text-secondary-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", variants[status] ?? variants.draft)}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
