import type { whisperModels } from "@/constants/types/ModelTypes";

import { NativeAsrEngine } from "../engines/nativeAsrEngine";
import { ParakeetAsrEngine } from "../engines/parakeetAsrEngine";
import { QwenAsrEngine } from "../engines/qwenAsrEngine";
import {
  ASREngine,
  ASREngineAvailabilityStatus,
  ASREngineMetadata,
  ASREngineType,
  AudioInput,
  TranscriptionResult,
} from "../types/asr.types";
import { createErrorTranscriptionResult } from "../utils/metricsHelpers";

export type ASREngineRegistryOptions = {
  whisperModel?: whisperModels;
};

const ENGINE_DETAILS: Record<ASREngineType, string> = {
  native: "Device speech recognition service",
  whisper: "Bundled local whisper.rn model",
  qwen: "Advanced multilingual Sherpa-ONNX candidate; requires Qwen3-ASR model files",
  parakeet: "NVIDIA Parakeet TDT NeMo transducer; requires Parakeet model files",
};

const getUnavailableStatus = (
  engineType: ASREngineType,
): ASREngineAvailabilityStatus => {
  if (engineType === "qwen" || engineType === "parakeet") {
    return "model-files-missing";
  }

  return "not-ready";
};

type ReadinessAwareEngine = ASREngine & {
  getReadinessStatus?: () => Promise<{
    status: ASREngineAvailabilityStatus;
    message: string;
  }>;
};

class UnavailableWhisperAsrEngine implements ASREngine {
  id: string;
  name = "Whisper base multilingual";
  engineType = "whisper" as const;
  mode = "local-model" as const;
  languageSupport: ASREngine["languageSupport"] = ["en", "fi"];
  supportsStreaming = false;
  runtimeMode = "unsupported" as const;

  constructor(modelName: whisperModels = "base") {
    this.id = `whisper-${modelName}`;
  }

  async isAvailable() {
    return false;
  }

  async initialize() {
    throw new Error("Whisper model asset is not bundled in this build.");
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    return createErrorTranscriptionResult(
      this,
      input,
      "Whisper model asset is not bundled in this build.",
      0,
      "unsupported",
    );
  }

  async dispose() {
    return undefined;
  }
}

export const getASREngineById = (
  id: string,
  options?: ASREngineRegistryOptions,
): ASREngine => {
  if (id === "native") {
    return new NativeAsrEngine();
  }

  if (id === "whisper") {
    return new UnavailableWhisperAsrEngine(options?.whisperModel ?? "base");
  }

  if (id === "qwen") {
    return new QwenAsrEngine();
  }

  if (id === "parakeet" || id === "parakeet-tdt-0.6b-v3-int8") {
    return new ParakeetAsrEngine();
  }

  return getDefaultASREngine();
};

export const getDefaultASREngine = (): ASREngine => new NativeAsrEngine();

export const getAvailableASREngines = async (
  options?: ASREngineRegistryOptions,
): Promise<ASREngineMetadata[]> => {
  const engines = [
    getASREngineById("native", options),
    getASREngineById("whisper", options),
    getASREngineById("qwen", options),
    getASREngineById("parakeet", options),
  ];

  const metadata = await Promise.all(
    engines.map(async (engine) => {
      const readiness = await (engine as ReadinessAwareEngine)
        .getReadinessStatus?.();
      const available = readiness ? readiness.status === "ready" : await engine.isAvailable();
      const status =
        readiness?.status ??
        (available ? "ready" : getUnavailableStatus(engine.engineType));

      return {
        id: engine.id,
        name: engine.name,
        engineType: engine.engineType,
        mode: engine.mode,
        languageSupport: [...engine.languageSupport],
        supportsStreaming: engine.supportsStreaming,
        runtimeMode: status === "ready" ? engine.runtimeMode : "unsupported",
        status,
        detail: ENGINE_DETAILS[engine.engineType],
        readinessMessage:
          readiness?.message ??
          (available
            ? "Ready"
            : status === "model-files-missing"
              ? "Model files missing or not configured"
              : "Not ready"),
      } satisfies ASREngineMetadata;
    }),
  );

  await Promise.all(engines.map((engine) => engine.dispose()));
  return metadata;
};
