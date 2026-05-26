export const PHASE4_EMBEDDINGGEMMA_MODEL = {
  modelId: "lmstudio-community/embeddinggemma-300m-qat-GGUF",
  filename: "embeddinggemma-300m-qat-Q4_0.gguf",
  documentSubdirectory: "models/embeddings/embeddinggemma-300m-qat-GGUF",
  queryPrefix: "task: search result | query: ",
  documentPrefix: "title: none | text: ",
} as const;
