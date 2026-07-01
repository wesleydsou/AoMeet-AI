import type { TranscriptionProvider } from "@/lib/providers/transcription";
import { readStoredFile } from "@/lib/services/storage";

const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

async function assemblyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ASSEMBLYAI_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: process.env.ASSEMBLYAI_API_KEY || "",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`AssemblyAI request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function uploadAndTranscribe(storageKey: string, language: string) {
  const buffer = await readStoredFile(storageKey);

  const upload = await assemblyFetch<{ upload_url: string }>("/upload", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });

  const transcript = await assemblyFetch<{ id: string }>("/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_url: upload.upload_url,
      language_code: language.split("-")[0] || "pt",
    }),
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await assemblyFetch<{ status: string; text?: string; error?: string }>(`/transcript/${transcript.id}`);

    if (status.status === "completed") {
      return status.text?.trim() || "";
    }

    if (status.status === "error") {
      throw new Error(status.error || "AssemblyAI transcription failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  throw new Error("AssemblyAI transcription timed out.");
}

export const assemblyAIProvider: TranscriptionProvider = {
  async transcribeAudio(storageKey, language) {
    return uploadAndTranscribe(storageKey, language);
  },
  async transcribeVideo(storageKey, language) {
    return uploadAndTranscribe(storageKey, language);
  },
  async cleanupTranscript(text) {
    return text.replaceAll(/\s+/g, " ").replaceAll(" ,", ",").replaceAll(" .", ".").trim();
  },
};
