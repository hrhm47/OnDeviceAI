import {
  ASREngine,
  ASRLanguage,
  AudioInput,
  TranscriptionResult,
} from "../types/asr.types";
import {
  createErrorTranscriptionResult,
  nowMs,
} from "../utils/metricsHelpers";

export const PARAKEET_MODEL_ID =
  "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_ASSET_MODEL_DIR =
  "models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_DOCUMENT_MODEL_DIR =
  "models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_EXPECTED_PROJECT_PATH =
  "assets/models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_MISSING_MODEL_ERROR =
  "Parakeet is optional in Phase 1 and is disabled until the Sherpa-ONNX Parakeet path is stable.";

export class ParakeetAsrEngine implements ASREngine {
  id = "parakeet";
  name = "Parakeet TDT Sherpa-ONNX";
  engineType = "parakeet" as const;
  mode = "local-model" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = false;
  runtimeMode = "unsupported" as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getReadinessStatus() {
    return {
      status: "not-ready" as const,
      message: PARAKEET_MISSING_MODEL_ERROR,
    };
  }

  async initialize(): Promise<void> {
    throw new Error(PARAKEET_MISSING_MODEL_ERROR);
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const startedAt = nowMs();

    try {
      throw new Error(PARAKEET_MISSING_MODEL_ERROR);
    } catch (error) {
      return createErrorTranscriptionResult(
        this,
        input,
        error,
        nowMs() - startedAt,
        "unsupported",
      );
    }
  }

  async dispose(): Promise<void> {
    return undefined;
  }
}
