import { SectionHeader } from "@/components/section-header";

const tools = [
  "Gerar resumo executivo",
  "Extrair tarefas",
  "Extrair decisoes",
  "Criar ata formal",
  "Criar follow-up comercial",
  "Criar e-mail pos-reuniao",
  "Limpar transcricao",
];

export default function AIToolsPage() {
  return (
    <>
      <SectionHeader
        eyebrow="IA"
        title="Ferramentas de IA"
        description="Este hub mostra as automacoes disponiveis no MVP e antecipa a troca futura de provider via .env sem acoplamento ao mock."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool, index) => (
          <div
            key={tool}
            className="glass-card p-6"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <p className="text-lg font-semibold">{tool}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Pronto para acionar o provider mockado agora e conectar OpenAI, Groq, Whisper ou AssemblyAI em uma proxima fase.
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
