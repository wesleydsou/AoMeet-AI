import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy");
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm");
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes}min`;
}

export function formatMediaTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatTranscriptFromSegments(
  segments: Array<{ speakerName: string; startTimeSeconds: number; text: string }>,
) {
  return segments
    .map((segment) => `[${segment.speakerName} — ${formatMediaTimestamp(segment.startTimeSeconds)}]\n${segment.text}`)
    .join("\n\n");
}

export function relativeTime(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function serializeCsvValue(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}

/** Converte resposta da IA (string ou array) para texto persistido no banco. */
export function normalizeAiTextField(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join("\n");
  }

  return String(value).trim();
}

/** Le listas salvas como texto (newline ou frases separadas por ponto). */
export function parseStoredListField(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  if (value.includes("\n")) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }

  return value.split(". ").map((item) => item.trim()).filter(Boolean);
}

export function buildMinutesMarkdown(input: {
  title: string;
  summary: string;
  participants: string[];
  highlights: string[];
  decisions: string[];
  tasks: Array<{ title: string; responsible?: string | null; dueDate?: string | null; status: string }>;
  risks: string[];
  nextSteps: string[];
  followUp: string;
}) {
  const lines = [
    "# Ata Inteligente da Reuniao",
    "",
    "## Resumo Executivo",
    input.summary || "Resumo nao disponivel.",
    "",
    "## Participantes",
    ...(input.participants.length ? input.participants.map((item) => `- ${item}`) : ["- Nao informado"]),
    "",
    "## Principais Pontos Discutidos",
    ...(input.highlights.length ? input.highlights.map((item) => `- ${item}`) : ["- Nao informado"]),
    "",
    "## Decisoes Tomadas",
    ...(input.decisions.length ? input.decisions.map((item) => `- ${item}`) : ["- Nao informado"]),
    "",
    "## Tarefas e Responsaveis",
    ...(input.tasks.length
      ? input.tasks.map(
          (task) =>
            `- ${task.title} | Responsavel: ${task.responsible || "A definir"} | Prazo: ${task.dueDate || "Nao informado"} | Status: ${task.status}`,
        )
      : ["- Nao informado"]),
    "",
    "## Riscos e Pontos de Atencao",
    ...(input.risks.length ? input.risks.map((item) => `- ${item}`) : ["- Nao informado"]),
    "",
    "## Proximos Passos",
    ...(input.nextSteps.length ? input.nextSteps.map((item) => `- ${item}`) : ["- Nao informado"]),
    "",
    "## Follow-up sugerido",
    input.followUp || "Follow-up nao disponivel.",
    "",
  ];

  return lines.join("\n");
}
