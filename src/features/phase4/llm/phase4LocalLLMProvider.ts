import * as FileSystem from "expo-file-system/legacy";
import type { LlamaContext } from "llama.rn";

import {
  buildPhase4HybridExtractionPrompt,
  PHASE4_RETRIEVED_CANDIDATE_LIMIT,
} from "./buildPhase4HybridExtractionPrompt";
import type { Phase4LLMProvider } from "./phase4LLMProvider";
import { PHASE4_SELECTED_LLM_MODEL } from "./phase4ModelConfig";

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
const PHASE4_LLM_CONTEXT_TOKENS = 3072;
const PHASE4_LLM_MAX_OUTPUT_TOKENS = 100;
const PHASE4_RESPONSE_SCHEMA_BASE = {
  type: "object",
  additionalProperties: false,
  required: [
    "multiIssueDetected",
    "selectedCompanyId",
    "selectedAreaId",
    "requiredActionCode",
    "dueDateCode",
    "tagCodes",
  ],
  properties: {
    multiIssueDetected: { type: "boolean" },
  },
};

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

    const prompt = buildPhase4HybridExtractionPrompt(input);
    const completionStartTime = Date.now();
    const result = await context.completion({
      messages: [
        {
          role: "system",
          content:
            "You are a controlled extraction engine. Return one valid JSON object only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          strict: true,
          schema: buildPhase4ResponseSchema(input),
        },
      },
      n_predict: PHASE4_LLM_MAX_OUTPUT_TOKENS,
      temperature: 0,
      top_p: 1,
      stop: STOP_WORDS,
    });
    const completedAt = Date.now();
    console.log("Phase 4 local LLM timing", {
      contextMs: contextReadyAt - contextStartTime,
      completionMs: completedAt - completionStartTime,
      totalMs: completedAt - startedAt,
      promptChars: prompt.length,
      contextTokens: PHASE4_LLM_CONTEXT_TOKENS,
      maxOutputTokens: PHASE4_LLM_MAX_OUTPUT_TOKENS,
      tokensPredicted: result.tokens_predicted,
      stoppedLimit: result.stopped_limit,
      contextFull: result.context_full,
      truncated: result.truncated,
      stoppedEos: result.stopped_eos,
    });

    return {
      rawText: result.text,
      durationMs: completedAt - startedAt,
      generationDiagnostics: {
        tokensPredicted: result.tokens_predicted,
        stoppedLimit: Boolean(result.stopped_limit),
        contextFull: result.context_full,
        truncated: result.truncated,
        stoppedEos: result.stopped_eos,
      },
    };
  },
};

export const runPhase4LocalLLMCompletion = async (input: {
  systemPrompt?: string;
  userPrompt: string;
  responseSchema?: object | null;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  repeatPenalty?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}) => {
  const startedAt = Date.now();
  const modelUri = await resolvePhase4LocalLLMModelUri();
  if (!modelUri) {
    throw new Error(
      `Phase 4 local model file was not found on this device. Expected ${getPhase4DocumentModelUri()}. Download or copy ${PHASE4_SELECTED_LLM_MODEL.filename} before using the local provider.`,
    );
  }

  const context = await getPhase4LlamaContext(modelUri);
  await context.clearCache(false).catch(() => undefined);


  const messages = [
    {
      role: "system" as const,
      content:
        input.systemPrompt ??
        "Follow the user's instructions exactly.",
    },
    { role: "user" as const, content: input.userPrompt },
  ];

  console.log(
    "Actual local LLM messages:",
    JSON.stringify(messages, null, 2),
  );

  const result = await context.completion({
    messages,
    response_format: input.responseSchema
      ? {
        type: "json_schema",
        json_schema: {
          strict: true,
          schema: input.responseSchema,
        },
      }
      : undefined,
    n_predict: input.maxOutputTokens ?? PHASE4_LLM_MAX_OUTPUT_TOKENS,
    temperature: input.temperature ?? 0,
    top_p: input.topP ?? 1,
    penalty_last_n: 64,
    penalty_repeat: input.repeatPenalty ?? 1.1,
    penalty_freq: input.frequencyPenalty ?? 0.1,
    penalty_present: input.presencePenalty ?? 0,
    stop: STOP_WORDS,

  });

  return {
    rawText: result.text,
    content: result.content,
    durationMs: Date.now() - startedAt,
    generationDiagnostics: {
      tokensPredicted: result.tokens_predicted,
      tokensEvaluated: result.tokens_evaluated,
      stoppedLimit: Boolean(result.stopped_limit),
      contextFull: result.context_full,
      truncated: result.truncated,
      stoppedEos: result.stopped_eos,
    },
  };
};

const buildPhase4ResponseSchema = (
  input: Parameters<Phase4LLMProvider["extractTaskForm"]>[0],
) => ({
  ...PHASE4_RESPONSE_SCHEMA_BASE,
  properties: {
    ...PHASE4_RESPONSE_SCHEMA_BASE.properties,
    selectedCompanyId: nullableEnum(
      visibleCandidateIds(input.retrieval.companyCandidates),
    ),
    selectedAreaId: nullableEnum(
      visibleCandidateIds(input.retrieval.areaCandidates),
    ),
    requiredActionCode: nullableEnum(
      visibleCandidateIds(input.retrieval.actionCandidates),
    ),
    dueDateCode: nullableEnum(
      visibleCandidateIds(input.retrieval.dateCandidates),
    ),
    tagCodes: stringArrayEnum(visibleCandidateIds(input.retrieval.tagCandidates)),
  },
});

const visibleCandidateIds = (
  candidates: { id?: string }[] | undefined,
) => compactUnique(candidates?.map((candidate) => candidate.id)).slice(
  0,
  PHASE4_RETRIEVED_CANDIDATE_LIMIT,
);

const nullableEnum = (values: (string | undefined)[] | undefined) => {
  const enumValues = compactUnique(values);
  return enumValues.length > 0
    ? { anyOf: [{ type: "string", enum: enumValues }, { type: "null" }] }
    : { type: "null" };
};

const stringArrayEnum = (values: (string | undefined)[] | undefined) => {
  const enumValues = compactUnique(values);
  return enumValues.length > 0
    ? {
      type: "array",
      items: { type: "string", enum: enumValues },
      maxItems: enumValues.length,
    }
    : {
      type: "array",
      items: { type: "string", enum: ["__no_tags_available__"] },
      maxItems: 0,
    };
};

const compactUnique = (values: (string | undefined)[] | undefined) =>
  Array.from(new Set((values ?? []).filter((value): value is string => Boolean(value))));

export const getPhase4LlamaContext = async (modelUri: string) => {
  if (cachedContext && cachedContextModelUri === modelUri) {
    return cachedContext;
  }

  await releasePhase4LocalLLMContext();
  const { initLlama } = await import("llama.rn");
  cachedContext = await initLlama({
    model: modelUri,
    use_mlock: true,
    n_ctx: PHASE4_LLM_CONTEXT_TOKENS,
    n_gpu_layers: 99,
    // cache_type_k: "q4_1",
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


export const testWithMessages = async () => {
  const modelUri =
    await resolvePhase4LocalLLMModelUri();

  if (!modelUri) {
    throw new Error("Model not found.");
  }

  const context =
    await getPhase4LlamaContext(modelUri);

  await context.clearCache(false);

  const result = await context.completion({
    messages: [
      {
        role: "system",
        content:
          "You are a strict construction classifier. " +
          "Return exactly one allowed label.",
      },
      {
        role: "user",
        content: `
Allowed labels:
electrical
plumbing
cleaning

Lighting and sockets are electrical.
Pipes and leaks are plumbing.
Dust and waste are cleaning.

Text: The first floor lighting is bad.

Label:
`.trim(),
      },
    ],

    n_predict: 32,
    temperature: 0,
    top_p: 1,
    penalty_repeat: 1.1,
    penalty_freq: 0,
    penalty_present: 0,
    stop: STOP_WORDS,
  });

  console.log(
    "Messages result:",
    JSON.stringify(result.text),
  );

  return result.text;
};

export const testWithManualQwenPrompt =
  async () => {
    const modelUri =
      await resolvePhase4LocalLLMModelUri();

    if (!modelUri) {
      throw new Error("Model not found.");
    }

    const context =
      await getPhase4LlamaContext(modelUri);

    await context.clearCache(false);

    const systemText =
      "You are a strict construction classifier. " +
      "Return exactly one allowed label.";

    const userText = `
Allowed labels:
electrical
plumbing
cleaning

Lighting and sockets are electrical.
Pipes and leaks are plumbing.
Dust and waste are cleaning.

Text: The first floor lighting is bad.

Label:
`.trim();

    const prompt =
      `<|im_start|>system\n` +
      `${systemText}<|im_end|>\n` +
      `<|im_start|>user\n` +
      `${userText}<|im_end|>\n` +
      `<|im_start|>assistant\n`;

    const result = await context.completion({
      prompt,

      n_predict: 32,
      temperature: 0,
      top_p: 1,
      penalty_repeat: 1.1,
      penalty_freq: 0,
      penalty_present: 0,

      stop: [
        "<|im_end|>",
        "<|endoftext|>",
      ],
    });

    console.log(
      "Manual Qwen result:",
      JSON.stringify(result.text),
    );

    return result.text;
  };