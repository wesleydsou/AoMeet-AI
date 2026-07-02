export type MeetingTaskExtract = {
  title: string;
  description: string;
  responsibleName: string;
  dueDate: string;
};

export type MeetingAnalysis = {
  summary: string;
  risks: string | string[];
  nextSteps: string | string[];
  highlights: string[];
  tasks: MeetingTaskExtract[];
  decisions: string[];
};

export type AIProvider = {
  analyzeMeetingTranscript(transcript: string): Promise<MeetingAnalysis>;
  generateMeetingSummary(transcript: string): Promise<{ summary: string; risks: string; nextSteps: string; highlights: string[] }>;
  extractTasks(transcript: string): Promise<MeetingTaskExtract[]>;
  extractDecisions(transcript: string): Promise<string[]>;
  answerQuestion(transcript: string, question: string): Promise<string>;
  generateFollowUpEmail(summary: string): Promise<string>;
};

export const mockAIProvider: AIProvider = {
  async analyzeMeetingTranscript(_transcript) {
    void _transcript;
    return {
      summary:
        "A reuniao consolidou um panorama operacional com foco em pendencias criticas, alinhamento comercial e proximas entregas do cliente.",
      risks:
        "Dependencia de retorno do cliente para dados adicionais, risco de atraso no handoff e necessidade de revisao do escopo tecnico.",
      nextSteps:
        "Validar cronograma final, confirmar responsaveis, enviar follow-up e organizar uma proxima reuniao de checkpoint.",
      highlights: [
        "Revisao dos objetivos da reuniao e do contexto do cliente.",
        "Mapeamento de prioridades operacionais e comerciais.",
        "Definicao das entregas imediatas e pontos de atencao.",
      ],
      tasks: [
        {
          title: "Enviar follow-up da reuniao",
          description: "Consolidar o que foi decidido e compartilhar com os participantes.",
          responsibleName: "Equipe comercial",
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        },
        {
          title: "Validar cronograma tecnico",
          description: "Revisar prazos, bloqueios e capacidade do time.",
          responsibleName: "Equipe de operacoes",
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
        },
      ],
      decisions: [
        "Prosseguir com o plano operacional em duas etapas.",
        "Centralizar as atualizacoes no painel do AoMeet AI.",
        "Agendar novo checkpoint com foco em risco e status das entregas.",
      ],
    };
  },
  async generateMeetingSummary(transcript) {
    const analysis = await mockAIProvider.analyzeMeetingTranscript(transcript);
    return {
      summary: analysis.summary,
      risks: typeof analysis.risks === "string" ? analysis.risks : analysis.risks.join("\n"),
      nextSteps: typeof analysis.nextSteps === "string" ? analysis.nextSteps : analysis.nextSteps.join("\n"),
      highlights: analysis.highlights,
    };
  },
  async extractTasks(transcript) {
    return (await mockAIProvider.analyzeMeetingTranscript(transcript)).tasks;
  },
  async extractDecisions(transcript) {
    return (await mockAIProvider.analyzeMeetingTranscript(transcript)).decisions;
  },
  async answerQuestion(_transcript, question) {
    return `Resposta simulada baseada no contexto da reuniao: "${question}". A IA identificou os pontos centrais, os responsaveis mais provaveis e as proximas acoes ligadas ao tema perguntado.`;
  },
  async generateFollowUpEmail(summary) {
    return `Ola, pessoal.\n\nObrigado pela reuniao de hoje. Segue o resumo executivo: ${summary}\n\nFicamos alinhados sobre as prioridades, tarefas e proximos passos. Vamos acompanhar os itens definidos e retornamos com a proxima atualizacao em breve.\n\nAbs,\nEquipe Aosafe`;
  },
};
