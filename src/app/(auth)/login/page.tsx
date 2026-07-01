import { AuthCard } from "@/components/auth-card";
import { loginAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="seuemail@empresa.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" placeholder="Sua senha" required />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
