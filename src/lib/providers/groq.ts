import type { AIProvider } from "@/lib/providers/ai";

const GROQ_BASE = "https://api.groq.com/openai/v1";

async function groqChat(system: string, user: string) {
  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed: ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function groqJson<T>(system: string, user: string): Promise<T> {
  const raw = await groqChat(`${system}\nResponda somente com JSON valido.`, user);
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned) as T;
}

export const groqAIProvider: AIProvider = {
  async generateMeetingSummary(transcript) {
    return groqJson<{ summary: string; risks: string; nextSteps: string; highlights: string[] }>(
      "Voce gera atas de reuniao em portugues do Brasil.",
      `Gere um JSON com summary (string), risks (string ou array de strings), nextSteps (string ou array de strings) e highlights (array de strings) a partir da transcricao:\n\n${transcript.slice(0, 120_000)}`,
    );
  },
  async extractTasks(transcript) {
    return groqJson<Array<{ title: string; description: string; responsibleName: string; dueDate: string }>>(
      "Extraia tarefas acionaveis de reunioes.",
      `Retorne um array JSON de tarefas com title, description, responsibleName e dueDate (ISO) a partir de:\n\n${transcript.slice(0, 120_000)}`,
    );
  },
  async extractDecisions(transcript) {
    return groqJson<string[]>(
      "Extraia decisoes tomadas em reunioes.",
      `Retorne um array JSON de strings com as decisoes de:\n\n${transcript.slice(0, 120_000)}`,
    );
  },
  async answerQuestion(transcript, question) {
    return groqChat(
      "Responda perguntas sobre a reuniao com base apenas na transcricao fornecida.",
      `Transcricao:\n${transcript.slice(0, 120_000)}\n\nPergunta: ${question}`,
    );
  },
  async generateFollowUpEmail(summary) {
    return groqChat(
      "Escreva e-mails de follow-up profissionais em portugues do Brasil.",
      `Escreva um e-mail de follow-up com base neste resumo:\n${summary}`,
    );
  },
};
