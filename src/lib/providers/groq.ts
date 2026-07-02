import type { AIProvider, MeetingAnalysis } from "@/lib/providers/ai";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function groqChat(system: string, user: string) {
  let lastError = "Groq request failed.";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content?.trim() || "";
    }

    const detail = await response.text().catch(() => "");
    lastError = `Groq request failed: ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`;

    if (response.status === 429 || response.status === 503) {
      const retryAfterHeader = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader * 1000 : (attempt + 1) * 2_000;
      await sleep(delayMs);
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError);
}

async function groqJson<T>(system: string, user: string): Promise<T> {
  const raw = await groqChat(`${system}\nResponda somente com JSON valido.`, user);
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned) as T;
}

export const groqAIProvider: AIProvider = {
  async analyzeMeetingTranscript(transcript) {
    return groqJson<MeetingAnalysis>(
      "Voce gera atas de reuniao em portugues do Brasil. Extraia resumo, riscos, proximos passos, destaques, tarefas e decisoes.",
      `Analise a transcricao e retorne um unico JSON com:
- summary (string)
- risks (string ou array de strings)
- nextSteps (string ou array de strings)
- highlights (array de strings)
- tasks (array com title, description, responsibleName, dueDate em ISO)
- decisions (array de strings)

Transcricao:
${transcript.slice(0, 120_000)}`,
    );
  },
  async generateMeetingSummary(transcript) {
    const analysis = await groqAIProvider.analyzeMeetingTranscript(transcript);
    return {
      summary: analysis.summary,
      risks: typeof analysis.risks === "string" ? analysis.risks : analysis.risks.join("\n"),
      nextSteps: typeof analysis.nextSteps === "string" ? analysis.nextSteps : analysis.nextSteps.join("\n"),
      highlights: analysis.highlights,
    };
  },
  async extractTasks(transcript) {
    const analysis = await groqAIProvider.analyzeMeetingTranscript(transcript);
    return analysis.tasks;
  },
  async extractDecisions(transcript) {
    const analysis = await groqAIProvider.analyzeMeetingTranscript(transcript);
    return analysis.decisions;
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
