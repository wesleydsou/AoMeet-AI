export type TranscriptSegmentInput = {
  speakerName: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
};

export type TranscriptionResult = {
  text: string;
  segments: TranscriptSegmentInput[];
};

export type TranscriptionProvider = {
  transcribeAudio(filePath: string, language: string): Promise<TranscriptionResult>;
  transcribeVideo(filePath: string, language: string): Promise<TranscriptionResult>;
  cleanupTranscript(text: string): Promise<string>;
};

function plainTextResult(text: string): TranscriptionResult {
  return { text, segments: [] };
}

export const mockTranscriptionProvider: TranscriptionProvider = {
  async transcribeAudio(filePath, language) {
    return plainTextResult(
      `Transcricao simulada de audio em ${language}. Arquivo privado recebido: ${filePath}. Principais temas: operacao, follow-up comercial, riscos de implantacao e proximos passos.`,
    );
  },
  async transcribeVideo(filePath, language) {
    return plainTextResult(
      `Transcricao simulada de video em ${language}. Arquivo privado recebido: ${filePath}. Discussao sobre prazos, tarefas distribuidas e definicoes tecnicas.`,
    );
  },
  async cleanupTranscript(text) {
    return text
      .replaceAll(/\s+/g, " ")
      .replaceAll(" ,", ",")
      .replaceAll(" .", ".")
      .trim();
  },
};
