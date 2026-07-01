import { AuthCard } from "@/components/auth-card";
import { registerAction } from "@/lib/actions/auth-actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Crie sua conta"
      description="Configure o ambiente inicial do MVP com sessao segura e token para a futura extensao do Google Meet."
      action="Cadastro"
      alternate={{ href: "/login", label: "Fazer login", prompt: "Ja possui uma conta?" }}
      error={params.error}
    >
      <form action={registerAction} className="space-y-4">
        <input className="form-input" name="name" type="text" placeholder="Nome completo" />
        <input className="form-input" name="email" type="email" placeholder="seuemail@empresa.com" />
        <input className="form-input" name="password" type="password" placeholder="Crie uma senha forte" />
        <button className="btn-primary w-full" type="submit">
          Criar conta
        </button>
      </form>
    </AuthCard>
  );
}
