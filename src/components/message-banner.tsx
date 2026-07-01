import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageBanner({
  message,
  tone = "info",
}: {
  message?: string;
  tone?: "info" | "error" | "success";
}) {
  if (!message) {
    return null;
  }

  const Icon = tone === "error" ? XCircle : tone === "success" ? CheckCircle2 : Info;

  return (
    <Alert
      className={cn(
        "mb-4",
        tone === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "success" && "border-chart-2/30 bg-chart-2/10 text-chart-2",
        tone === "info" && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <Icon className="size-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
