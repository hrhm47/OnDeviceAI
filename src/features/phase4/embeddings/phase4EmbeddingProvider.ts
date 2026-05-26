export type Phase4EmbeddingReadiness = {
  ready: boolean;
  modelUri: string | null;
  message: string;
};

export type Phase4EmbeddingProvider = {
  providerId: string;
  modelId: string;
  embedQuery(text: string): Promise<number[]>;
  embedDocument(text: string): Promise<number[]>;
  getReadiness(): Promise<Phase4EmbeddingReadiness>;
};
