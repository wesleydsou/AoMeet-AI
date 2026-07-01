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

  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>{message}</div>;
}
