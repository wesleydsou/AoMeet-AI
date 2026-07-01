import { assemblyAIProvider } from "@/lib/providers/assemblyai";
import { groqAIProvider } from "@/lib/providers/groq";
import { groqTranscriptionProvider } from "@/lib/providers/groq-transcription";
import { mockAIProvider } from "@/lib/providers/ai";
import { mockTranscriptionProvider } from "@/lib/providers/transcription";
import { openaiAIProvider, openaiTranscriptionProvider } from "@/lib/providers/openai";
import type { AIProvider } from "@/lib/providers/ai";
import type { TranscriptionProvider } from "@/lib/providers/transcription";

export function getTranscriptionProvider(): TranscriptionProvider {
  if (process.env.ASSEMBLYAI_API_KEY?.trim()) {
    return assemblyAIProvider;
  }

  if (process.env.GROQ_API_KEY?.trim()) {
    return groqTranscriptionProvider;
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    return openaiTranscriptionProvider;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Nenhum provider de transcricao configurado. Defina ASSEMBLYAI_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY.",
    );
  }

  return mockTranscriptionProvider;
}

export function getAIProvider(): AIProvider {
  if (process.env.GROQ_API_KEY?.trim()) {
    return groqAIProvider;
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    return openaiAIProvider;
  }

  return mockAIProvider;
}
