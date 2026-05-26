import * as FileSystem from "expo-file-system/legacy";
import type { LlamaContext } from "llama.rn";

import { PHASE4_EMBEDDINGGEMMA_MODEL } from "./phase4EmbeddingGemmaConfig";
import type { Phase4EmbeddingProvider } from "./phase4EmbeddingProvider";

let cachedContext: LlamaContext | null = null;
let cachedContextModelUri: string | null = null;

export const phase4EmbeddingGemmaProvider: Phase4EmbeddingProvider = {
  providerId: "phase4_embeddinggemma_llama_rn_v1",
  modelId: PHASE4_EMBEDDINGGEMMA_MODEL.modelId,
  async embedQuery(text) {
    return embed(`${PHASE4_EMBEDDINGGEMMA_MODEL.queryPrefix}${text}`);
  },
  async embedDocument(text) {
    return embed(`${PHASE4_EMBEDDINGGEMMA_MODEL.documentPrefix}${text}`);
  },
  getReadiness: getPhase4EmbeddingGemmaReadiness,
};

export const getPhase4EmbeddingGemmaDocumentModelUri = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for EmbeddingGemma.");
  }

  return `${documentDirectory}${PHASE4_EMBEDDINGGEMMA_MODEL.documentSubdirectory}/${PHASE4_EMBEDDINGGEMMA_MODEL.filename}`;
};

export const resolvePhase4EmbeddingGemmaModelUri = async () => {
  const modelUri = getPhase4EmbeddingGemmaDocumentModelUri();
  const modelInfo = await FileSystem.getInfoAsync(modelUri);
  return modelInfo.exists ? modelUri : null;
};

export const downloadPhase4EmbeddingGemmaModel = async (
  onProgress?: (percent: number) => void,
) => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for EmbeddingGemma.");
  }

  const modelDirUri = `${documentDirectory}${PHASE4_EMBEDDINGGEMMA_MODEL.documentSubdirectory}/`;
  await FileSystem.makeDirectoryAsync(modelDirUri, { intermediates: true }).catch(
    async (error) => {
      const info = await FileSystem.getInfoAsync(modelDirUri);
      if (!info.exists) {
        throw error;
      }
    },
  );

  const modelUri = getPhase4EmbeddingGemmaDocumentModelUri();
  const download = FileSystem.createDownloadResumable(
    PHASE4_EMBEDDINGGEMMA_MODEL.sourceUrl,
    modelUri,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress?.((totalBytesWritten / totalBytesExpectedToWrite) * 100);
      }
    },
  );
  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error("EmbeddingGemma model download did not complete.");
  }

  return result.uri;
};

export async function getPhase4EmbeddingGemmaReadiness() {
  try {
    const modelUri = await resolvePhase4EmbeddingGemmaModelUri();
    return {
      ready: Boolean(modelUri),
      modelUri,
      message: modelUri
        ? `EmbeddingGemma model ready at ${modelUri}`
        : `EmbeddingGemma model missing. Expected ${getPhase4EmbeddingGemmaDocumentModelUri()}`,
    };
  } catch (error) {
    return {
      ready: false,
      modelUri: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export const releasePhase4EmbeddingGemmaContext = async () => {
  if (!cachedContext) {
    cachedContextModelUri = null;
    return;
  }

  const context = cachedContext;
  cachedContext = null;
  cachedContextModelUri = null;
  await context.release().catch(() => undefined);
};

const embed = async (text: string) => {
  const modelUri = await resolvePhase4EmbeddingGemmaModelUri();
  if (!modelUri) {
    throw new Error(
      `EmbeddingGemma GGUF was not found. Expected ${getPhase4EmbeddingGemmaDocumentModelUri()}`,
    );
  }

  const context = await getEmbeddingContext(modelUri);
  const result = await context.embedding(text, { embd_normalize: 2 });
  return result.embedding;
};

const getEmbeddingContext = async (modelUri: string) => {
  if (cachedContext && cachedContextModelUri === modelUri) {
    return cachedContext;
  }

  await releasePhase4EmbeddingGemmaContext();
  const { initLlama } = await import("llama.rn");
  cachedContext = await initLlama({
    model: modelUri,
    embedding: true,
    pooling_type: "mean",
    n_ctx: 512,
    n_gpu_layers: 99,
  });
  cachedContextModelUri = modelUri;
  return cachedContext;
};
