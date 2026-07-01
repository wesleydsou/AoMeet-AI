import { AuthCard } from "@/components/auth-card";
import { loginAction } from "@/lib/actions/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Entre no AoMeet AI"
      description="Acesse o painel para gerenciar reunioes, gerar resumos e acompanhar o uso do seu plano."
      action="Login"
      alternate={{ href: "/register", label: "Criar conta", prompt: "Ainda nao tem acesso?" }}
      error={params.error}
    >
      <form action={loginAction} className="space-y-4">
        <input className="form-input" name="email" type="email" placeholder="seuemail@empresa.com" />
        <input className="form-input" name="password" type="password" placeholder="Sua senha" />
        <button className="btn-primary w-full" type="submit">
          Entrar
        </button>
      </form>
    </AuthCard>
  );
}
