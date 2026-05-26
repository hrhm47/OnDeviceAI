export const PHASE4_EMBEDDINGGEMMA_MODEL = {
  modelId: "lmstudio-community/embeddinggemma-300m-qat-GGUF",
  filename: "embeddinggemma-300m-qat-Q4_0.gguf",
  sourceUrl:
    "https://huggingface.co/lmstudio-community/embeddinggemma-300m-qat-GGUF/resolve/main/embeddinggemma-300m-qat-Q4_0.gguf?download=true",
  documentSubdirectory: "models/embeddings/embeddinggemma-300m-qat-GGUF",
  queryPrefix: "task: search result | query: ",
  documentPrefix: "title: none | text: ",
} as const;
