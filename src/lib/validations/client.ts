import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Informe o nome do contato."),
  companyName: z.string().min(2, "Informe a empresa."),
  email: z.string().email("Informe um e-mail valido."),
  phone: z.string().optional(),
});
