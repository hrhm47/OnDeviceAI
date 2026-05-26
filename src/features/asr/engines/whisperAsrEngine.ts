import type { whisperModels } from "@/constants/types/ModelTypes";

import {
  ASREngine,
  ASRLanguage,
  AudioInput,
  TranscriptionResult,
} from "../types/asr.types";
import { getWhisperLanguage, stripFileProtocol } from "../utils/audioHelpers";
import {
  createBaseTranscriptionResult,
  createErrorTranscriptionResult,
  nowMs,
} from "../utils/metricsHelpers";

const WHISPER_MODEL_ASSETS: Partial<Record<whisperModels, number>> = {};

export class WhisperAsrEngine implements ASREngine {
  id: string;
  name: string;
  engineType = "whisper" as const;
  mode = "local-model" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = false;
  runtimeMode = "offline-full-recording" as const;

  private context: any = null;

  constructor(private readonly modelName: whisperModels = "base") {
    this.id = `whisper-${modelName}`;
    this.name = "Whisper base multilingual";
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

    const { initWhisper } = await import("whisper.rn");
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

      await this.initialize();

      const { promise } = this.context.transcribe(
        stripFileProtocol(input.uri),
        {
          language: getWhisperLanguage(input.language),
        },
      );
      const response = await promise;
      const transcript = response?.result?.trim() ?? "";
      const transcriptionTimeMs = nowMs() - startedAt;

      return createBaseTranscriptionResult(this, input, {
        transcript,
        transcriptionTimeMs,
        timeToFirstTextMs: transcript ? transcriptionTimeMs : null,
        runtimeMode: "offline-full-recording",
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
