import type { whisperModels } from "@/constants/types/ModelTypes";

import { NativeAsrEngine } from "../engines/nativeAsrEngine";
import { ParakeetAsrEngine } from "../engines/parakeetAsrEngine";
import { QwenAsrEngine } from "../engines/qwenAsrEngine";
import { WhisperAsrEngine } from "../engines/whisperAsrEngine";
import {
  ASREngine,
  ASREngineAvailabilityStatus,
  ASREngineMetadata,
  ASREngineType,
} from "../types/asr.types";

export type ASREngineRegistryOptions = {
  whisperModel?: whisperModels;
};

const ENGINE_DETAILS: Record<ASREngineType, string> = {
  native: "Device speech recognition service",
  whisper: "Bundled local whisper.rn model",
  qwen: "Advanced multilingual Sherpa-ONNX candidate; requires Qwen3-ASR model files",
  parakeet: "Experimental Sherpa-ONNX Parakeet TDT candidate; optional in Phase 1",
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

export const getASREngineById = (
  id: string,
  options?: ASREngineRegistryOptions,
): ASREngine => {
  if (id === "native") {
    return new NativeAsrEngine();
  }

  if (id === "whisper") {
    return new WhisperAsrEngine(options?.whisperModel ?? "tiny.en");
  }

  if (id === "qwen") {
    return new QwenAsrEngine();
  }

  if (id === "parakeet") {
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
