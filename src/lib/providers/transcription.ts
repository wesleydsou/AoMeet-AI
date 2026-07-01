export type TranscriptionProvider = {
  transcribeAudio(filePath: string, language: string): Promise<string>;
  transcribeVideo(filePath: string, language: string): Promise<string>;
  cleanupTranscript(text: string): Promise<string>;
};

export const mockTranscriptionProvider: TranscriptionProvider = {
  async transcribeAudio(filePath, language) {
    return `Transcricao simulada de audio em ${language}. Arquivo privado recebido: ${filePath}. Principais temas: operacao, follow-up comercial, riscos de implantacao e proximos passos.`;
  },
  async transcribeVideo(filePath, language) {
    return `Transcricao simulada de video em ${language}. Arquivo privado recebido: ${filePath}. Discussao sobre prazos, tarefas distribuidas e definicoes tecnicas.`;
  },
  async cleanupTranscript(text) {
    return text
      .replaceAll(/\s+/g, " ")
      .replaceAll(" ,", ",")
      .replaceAll(" .", ".")
      .trim();
  },
};
