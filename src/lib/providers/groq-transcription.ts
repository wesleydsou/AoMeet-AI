import type { TranscriptionProvider } from "@/lib/providers/transcription";
import { readStoredFile } from "@/lib/services/storage";

const GROQ_BASE = "https://api.groq.com/openai/v1";

function getFileName(storageKey: string) {
  const objectPath = storageKey.includes(":") ? storageKey.split(":").slice(1).join(":") : storageKey;
  return objectPath.split("/").pop() || "audio.m4a";
}

async function transcribeWithGroqWhisper(storageKey: string, language: string) {
  const buffer = await readStoredFile(storageKey);
  const fileName = getFileName(storageKey);

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), fileName);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", language.split("-")[0] || "pt");
  form.append("response_format", "json");

  const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Groq Whisper falhou (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim();

  if (!text) {
    throw new Error("Groq Whisper retornou transcricao vazia.");
  }

  return text;
}

export const groqTranscriptionProvider: TranscriptionProvider = {
  async transcribeAudio(storageKey, language) {
    return transcribeWithGroqWhisper(storageKey, language);
  },
  async transcribeVideo(storageKey, language) {
    return transcribeWithGroqWhisper(storageKey, language);
  },
  async cleanupTranscript(text) {
    return text.replaceAll(/\s+/g, " ").replaceAll(" ,", ",").replaceAll(" .", ".").trim();
  },
};
