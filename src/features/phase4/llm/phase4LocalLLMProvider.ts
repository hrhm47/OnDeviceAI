import * as FileSystem from "expo-file-system/legacy";
import type { LlamaContext } from "llama.rn";

import type { Phase4LLMProvider } from "./phase4LLMProvider";
import { PHASE4_SELECTED_LLM_MODEL } from "./phase4ModelConfig";
import { buildPhase4HybridExtractionPrompt } from "./buildPhase4HybridExtractionPrompt";

const MODEL_DIR = `models/llm/${PHASE4_SELECTED_LLM_MODEL.modelId}`;
const MODEL_PATH = `${MODEL_DIR}/${PHASE4_SELECTED_LLM_MODEL.filename}`;
const STOP_WORDS = [
  "</s>",
  "<|end|>",
  "<|eot_id|>",
  "<|end_of_text|>",
  "<|im_end|>",
  "<|endoftext|>",
];

let cachedContext: LlamaContext | null = null;
let cachedContextModelUri: string | null = null;

export const phase4LocalLLMProvider: Phase4LLMProvider = {
  providerId: "phase4_local_llm_provider_qwen2_5_llama_rn_v1",
  method: "local_llm_with_validation",
  async extractTaskForm(input) {
    const startedAt = Date.now();
    const modelUri = await resolvePhase4LocalLLMModelUri();
    if (!modelUri) {
      throw new Error(
        `Phase 4 local model file was not found on this device. Expected ${getPhase4DocumentModelUri()}. Download or copy ${PHASE4_SELECTED_LLM_MODEL.filename} before using the local provider.`,
      );
    }

    const contextStartTime = Date.now();
    const context = await getPhase4LlamaContext(modelUri);
    const contextReadyAt = Date.now();
    await context.clearCache(false).catch(() => undefined);

    const completionStartTime = Date.now();
    const result = await context.completion({
      messages: [
        {
          role: "system",
          content:
            "You are a controlled extraction engine. Return one valid JSON object only.",
        },
        { role: "user", content: buildPhase4HybridExtractionPrompt(input) },
      ],
      response_format: { type: "json_object" },
      n_predict: 256,
      temperature: 0,
      top_p: 1,
      stop: STOP_WORDS,
    });
    const completedAt = Date.now();
    console.log("Phase 4 local LLM timing", {
      contextMs: contextReadyAt - contextStartTime,
      completionMs: completedAt - completionStartTime,
      totalMs: completedAt - startedAt,
    });

    return {
      rawText: result.text,
      durationMs: completedAt - startedAt,
    };
  },
};

const getPhase4LlamaContext = async (modelUri: string) => {
  if (cachedContext && cachedContextModelUri === modelUri) {
    return cachedContext;
  }

  await releasePhase4LocalLLMContext();
  const { initLlama } = await import("llama.rn");
  cachedContext = await initLlama({
    model: modelUri,
    use_mlock: true,
    n_ctx: 1024,
    n_gpu_layers: 99,
    cache_type_k: "q4_1",
  });
  cachedContextModelUri = modelUri;
  return cachedContext;
};

export const releasePhase4LocalLLMContext = async () => {
  if (!cachedContext) {
    cachedContextModelUri = null;
    return;
  }

  const context = cachedContext;
  cachedContext = null;
  cachedContextModelUri = null;
  await context.release().catch(() => undefined);
};

export const getPhase4DocumentModelUri = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for Phase 4 LLM model.");
  }

  return `${documentDirectory}${MODEL_PATH}`;
};

export const resolvePhase4LocalLLMModelUri = async () => {
  const documentModelUri = getPhase4DocumentModelUri();
  const documentInfo = await FileSystem.getInfoAsync(documentModelUri);
  return documentInfo.exists ? documentModelUri : null;
};

export const downloadPhase4LocalLLMModel = async (
  onProgress?: (percent: number) => void,
) => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for Phase 4 LLM model.");
  }

  const modelDirUri = `${documentDirectory}${MODEL_DIR}/`;
  await FileSystem.makeDirectoryAsync(modelDirUri, { intermediates: true }).catch(
    async (error) => {
      const info = await FileSystem.getInfoAsync(modelDirUri);
      if (!info.exists) {
        throw error;
      }
    },
  );

  const modelUri = getPhase4DocumentModelUri();
  const download = FileSystem.createDownloadResumable(
    PHASE4_SELECTED_LLM_MODEL.sourceUrl,
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
    throw new Error("Phase 4 local LLM model download did not complete.");
  }

  return result.uri;
};

export const getPhase4LocalLLMReadiness = async () => {
  try {
    const modelUri = await resolvePhase4LocalLLMModelUri();
    return {
      ready: Boolean(modelUri),
      modelUri,
      message: modelUri
        ? `Local model ready at ${modelUri}`
        : `Model missing. Expected ${getPhase4DocumentModelUri()}`,
    };
  } catch (error) {
    return {
      ready: false,
      modelUri: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

export const loadPhase4LocalLLMModelInfo = async () => {
  const modelUri = await resolvePhase4LocalLLMModelUri();
  if (!modelUri) {
    throw new Error(
      `Phase 4 local model file was not found. Expected ${getPhase4DocumentModelUri()}`,
    );
  }

  const { loadLlamaModelInfo } = await import("llama.rn");
  return loadLlamaModelInfo(modelUri);
};
