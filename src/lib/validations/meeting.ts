import { z } from "zod";

export const meetingSchema = z.object({
  title: z.string().trim().min(3, "Informe um titulo.").max(160, "Titulo muito longo."),
  clientId: z.string().cuid().optional(),
  meetingDate: z.string().datetime({ local: true, message: "Informe uma data valida." }),
  platform: z.string().trim().min(2, "Informe a plataforma.").max(80),
  language: z.string().trim().min(2, "Informe o idioma.").max(15),
  participantsText: z.string().max(5_000, "Lista de participantes muito longa.").optional(),
  transcriptText: z.string().max(80_000, "Transcricao muito longa para processamento imediato.").optional(),
  meetingUrl: z.union([z.literal(""), z.url("Informe uma URL valida.")]).optional(),
  sourceType: z.enum(["upload", "transcript_import", "manual", "chrome_extension", "google_meet"]),
  consentConfirmed: z
    .string()
    .refine((value) => value === "on", "Confirme a autorizacao para registrar ou transcrever a reuniao."),
});

export const askAiSchema = z.object({
  question: z.string().trim().min(3, "Digite uma pergunta para a IA.").max(500, "Pergunta muito longa."),
});

export const shareMeetingSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido.").max(160),
  permission: z.enum(["view", "comment", "edit"]),
});
