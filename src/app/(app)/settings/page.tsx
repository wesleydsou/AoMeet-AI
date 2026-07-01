import { MessageBanner } from "@/components/message-banner";
import { SectionHeader } from "@/components/section-header";
import { regenerateExtensionTokenAction, updateSettingsAction } from "@/lib/actions/settings-actions";
import { requireUser } from "@/lib/auth";
import { meetingLanguages } from "@/lib/constants";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; extensionToken?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  return (
    <>
      <SectionHeader
        eyebrow="Configuracoes"
        title="Preferencias do workspace"
        description="Atualize perfil, idioma padrao e retencao de arquivos. Limites de plano e credenciais sensiveis permanecem sob controle do backend."
      />
      <MessageBanner message={params.error} tone="error" />
      <MessageBanner message={params.success} tone="success" />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <form action={updateSettingsAction} className="glass-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input className="form-input" name="name" defaultValue={user.name} placeholder="Nome" />
            <input className="form-input" value={user.plan} readOnly aria-readonly="true" />
            <select className="form-select" name="defaultLanguage" defaultValue={user.defaultLanguage}>
              {meetingLanguages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <input className="form-input" name="fileRetentionDays" type="number" defaultValue={user.fileRetentionDays} min={7} max={365} />
          </div>
          <button className="btn-primary mt-5" type="submit">
            Salvar configuracoes
          </button>
        </form>

        <div className="glass-card p-6">
          <p className="panel-title">Token da extensao</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Este token autentica a extensao Chrome no backend. Guarde-o em local seguro — ele nao fica armazenado em texto puro no banco.
          </p>
          {params.extensionToken ? (
            <pre className="code-block mt-4">{params.extensionToken}</pre>
          ) : (
            <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              Token configurado. Gere um novo token para copiar e usar na extensao Chrome.
            </p>
          )}
          <form action={regenerateExtensionTokenAction} className="mt-4">
            <button className="btn-secondary" type="submit">
              Gerar novo token
            </button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Arquivos ficam no Bunny Storage (producao) ou storage local (desenvolvimento). Chaves de API de IA e transcricao permanecem apenas no servidor.
          </p>
        </div>
      </div>
    </>
  );
}
