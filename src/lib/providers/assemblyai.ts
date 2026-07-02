import type { TranscriptionProvider, TranscriptionResult, TranscriptSegmentInput } from "@/lib/providers/transcription";
import { formatTranscriptFromSegments } from "@/lib/utils";
import { readStoredFile } from "@/lib/services/storage";

const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

type AssemblyUtterance = {
  speaker: string;
  text: string;
  start: number;
  end: number;
};

type AssemblyTranscriptStatus = {
  status: string;
  text?: string;
  error?: string;
  utterances?: AssemblyUtterance[];
};

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

function speakerLabel(speaker: string) {
  return `Locutor ${speaker}`;
}

function buildSegmentsFromUtterances(utterances: AssemblyUtterance[]): TranscriptSegmentInput[] {
  return utterances
    .map((utterance) => ({
      speakerName: speakerLabel(utterance.speaker),
      startTimeSeconds: Math.floor(utterance.start / 1000),
      endTimeSeconds: Math.ceil(utterance.end / 1000),
      text: utterance.text.trim(),
    }))
    .filter((segment) => segment.text.length > 0);
}

async function uploadAndTranscribe(storageKey: string, language: string): Promise<TranscriptionResult> {
  const buffer = await readStoredFile(storageKey);

  const upload = await assemblyFetch<{ upload_url: string }>("/upload", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Uint8Array(buffer),
  });

  const transcript = await assemblyFetch<{ id: string }>("/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_url: upload.upload_url,
      language_code: language.split("-")[0] || "pt",
      speaker_labels: true,
      punctuate: true,
      format_text: true,
    }),
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await assemblyFetch<AssemblyTranscriptStatus>(`/transcript/${transcript.id}`);

    if (status.status === "completed") {
      const segments = status.utterances?.length ? buildSegmentsFromUtterances(status.utterances) : [];

      if (segments.length) {
        return {
          text: formatTranscriptFromSegments(segments),
          segments,
        };
      }

      return {
        text: status.text?.trim() || "",
        segments: [],
      };
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
    return text.trim();
  },
};
