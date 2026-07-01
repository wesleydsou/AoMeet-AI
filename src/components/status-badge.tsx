import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  queued: "bg-indigo-100 text-indigo-700",
  uploaded: "bg-sky-100 text-sky-700",
  transcribing: "bg-cyan-100 text-cyan-700",
  summarizing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  archived: "bg-zinc-200 text-zinc-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize", map[status] ?? "bg-slate-100 text-slate-700")}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
