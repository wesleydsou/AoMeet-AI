import type { AIProvider } from "@/lib/providers/ai";
import type { TranscriptionProvider } from "@/lib/providers/transcription";

const OPENAI_BASE = "https://api.openai.com/v1";

async function openaiChat(system: string, user: string) {
  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function openaiJson<T>(system: string, user: string): Promise<T> {
  const raw = await openaiChat(`${system}\nResponda somente com JSON valido.`, user);
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned) as T;
}

export const openaiAIProvider: AIProvider = {
  async generateMeetingSummary(transcript) {
    return openaiJson<{ summary: string; risks: string; nextSteps: string; highlights: string[] }>(
      "Voce gera atas de reuniao em portugues do Brasil.",
      `Gere um JSON com summary (string), risks (string ou array de strings), nextSteps (string ou array de strings) e highlights (array de strings) a partir da transcricao:\n\n${transcript.slice(0, 120_000)}`,
    );
  },
  async extractTasks(transcript) {
    return openaiJson<Array<{ title: string; description: string; responsibleName: string; dueDate: string }>>(
      "Extraia tarefas acionaveis de reunioes.",
      `Retorne um array JSON de tarefas com title, description, responsibleName e dueDate (ISO) a partir de:\n\n${transcript.slice(0, 120_000)}`,
    );
  },
  async extractDecisions(transcript) {
    return openaiJson<string[]>(
      "Extraia decisoes tomadas em reunioes.",
      `Retorne um array JSON de strings com as decisoes de:\n\n${transcript.slice(0, 120_000)}`,
    );
  },
  async answerQuestion(transcript, question) {
    return openaiChat(
      "Responda perguntas sobre a reuniao com base apenas na transcricao fornecida.",
      `Transcricao:\n${transcript.slice(0, 120_000)}\n\nPergunta: ${question}`,
    );
  },
  async generateFollowUpEmail(summary) {
    return openaiChat(
      "Escreva e-mails de follow-up profissionais em portugues do Brasil.",
      `Escreva um e-mail de follow-up com base neste resumo:\n${summary}`,
    );
  },
};

export const openaiTranscriptionProvider: TranscriptionProvider = {
  async transcribeAudio(filePath, language) {
    return transcribeWithWhisper(filePath, language);
  },
  async transcribeVideo(filePath, language) {
    return transcribeWithWhisper(filePath, language);
  },
  async cleanupTranscript(text) {
    return text.replaceAll(/\s+/g, " ").replaceAll(" ,", ",").replaceAll(" .", ".").trim();
  },
};

async function transcribeWithWhisper(filePath: string, language: string) {
  const { readStoredFile } = await import("@/lib/services/storage");
  const buffer = await readStoredFile(filePath);

  const form = new FormData();
  form.append("file", new Blob([buffer]), "audio.webm");
  form.append("model", "whisper-1");
  form.append("language", language.split("-")[0] || "pt");

  const response = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Whisper transcription failed: ${response.status}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() || "";
}
