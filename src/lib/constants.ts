import {
  Archive,
  Bot,
  ChartColumnBig,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Settings,
  Share2,
  Users,
} from "lucide-react";

export const planLimits = {
  FREE: { meetings: 3, aiCredits: 3, storageBytes: 100 * 1024 * 1024, uploadLabel: "Upload limitado" },
  PRO: { meetings: 30, aiCredits: 100, storageBytes: 1024 * 1024 * 1024, uploadLabel: "Exportacao PDF/Markdown" },
  BUSINESS: { meetings: 100, aiCredits: 500, storageBytes: 5 * 1024 * 1024 * 1024, uploadLabel: "Relatorios e compartilhamento" },
  PREMIUM: { meetings: 9999, aiCredits: 9999, storageBytes: 20 * 1024 * 1024 * 1024, uploadLabel: "Uso customizado e integracoes" },
} as const;

export const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Minhas reunioes", icon: FolderKanban },
  { href: "/reports", label: "Relatorios", icon: ChartColumnBig },
  { href: "/ai-tools", label: "Ferramentas de IA", icon: Bot },
  { href: "/shared", label: "Compartilhado comigo", icon: Share2 },
  { href: "/archive", label: "Arquivo", icon: Archive },
  { href: "/settings", label: "Configuracoes", icon: Settings },
  { href: "/usage", label: "Uso do plano", icon: Gauge },
  { href: "/clients", label: "Clientes", icon: Users },
];

export const meetingStatuses = [
  "draft",
  "queued",
  "uploaded",
  "transcribing",
  "summarizing",
  "completed",
  "failed",
  "archived",
] as const;

export const meetingPlatforms = ["Google Meet", "Zoom", "Microsoft Teams", "Presencial", "Outra"];

export const meetingLanguages = ["pt-BR", "en-US", "es-ES"];
