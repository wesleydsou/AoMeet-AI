import { AuthCard } from "@/components/auth-card";
import { registerAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Crie sua conta"
      description="Comece a transformar suas reunioes em atas, tarefas e follow-ups automaticos."
      action="Cadastro"
      alternate={{ href: "/login", label: "Fazer login", prompt: "Ja possui uma conta?" }}
      error={params.error}
    >
      <form action={registerAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" type="text" placeholder="Nome completo" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="seuemail@empresa.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" placeholder="Minimo 8 caracteres" required />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Criar conta
        </Button>
      </form>
    </AuthCard>
  );
}
