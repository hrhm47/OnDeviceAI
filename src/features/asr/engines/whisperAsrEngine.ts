import { initWhisper } from "whisper.rn";

import type { whisperModels } from "@/constants/types/ModelTypes";

import {
  ASREngine,
  ASRLanguage,
  AudioInput,
  TranscriptionResult,
} from "../types/asr.types";
import { getWhisperLanguage } from "../utils/audioHelpers";
import {
  createBaseTranscriptionResult,
  createErrorTranscriptionResult,
  nowMs,
} from "../utils/metricsHelpers";

const WHISPER_MODEL_ASSETS: Record<whisperModels, number> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  "tiny.en": require("../../../../assets/whisper/ggml-tiny.en.bin"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  tiny: require("../../../../assets/whisper/ggml-tiny.bin"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  "base.en": require("../../../../assets/whisper/ggml-base.en.bin"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  base: require("../../../../assets/whisper/ggml-base.bin"),
};

export class WhisperAsrEngine implements ASREngine {
  id: string;
  name: string;
  engineType = "whisper" as const;
  mode = "local-model" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = false;

  private context: any = null;

  constructor(private readonly modelName: whisperModels = "tiny.en") {
    this.id = `whisper-${modelName}`;
    this.name = `Whisper ${modelName}`;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(WHISPER_MODEL_ASSETS[this.modelName]);
  }

  async initialize(): Promise<void> {
    if (this.context) {
      return;
    }

    const modelAsset = WHISPER_MODEL_ASSETS[this.modelName];
    if (!modelAsset) {
      throw new Error(`Whisper model asset is missing: ${this.modelName}.`);
    }

    this.context = await initWhisper({
      filePath: modelAsset,
    });
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const startedAt = nowMs();

    try {
      if (!input.uri) {
        throw new Error("Whisper requires a recorded audio URI.");
      }

      if (this.modelName.endsWith(".en") && input.language !== "en") {
        throw new Error(
          `${this.name} is English-only. Select Whisper tiny/base for Finnish.`,
        );
      }

      await this.initialize();

      const { promise } = this.context.transcribe(input.uri, {
        language: getWhisperLanguage(input.language),
      });
      const response = await promise;
      const transcript = response?.result ?? "";
      const transcriptionTimeMs = nowMs() - startedAt;

      return createBaseTranscriptionResult(this, input, {
        transcript,
        transcriptionTimeMs,
        timeToFirstTextMs: transcript ? transcriptionTimeMs : null,
      });
    } catch (error) {
      return createErrorTranscriptionResult(
        this,
        input,
        error,
        nowMs() - startedAt,
      );
    }
  }

  async dispose(): Promise<void> {
    if (this.context?.release) {
      await this.context.release();
    }
    this.context = null;
  }
}
