import { z } from "zod";

export const settingsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
  defaultLanguage: z.string().trim().min(2, "Informe o idioma."),
  fileRetentionDays: z.coerce.number().min(7).max(365),
});
