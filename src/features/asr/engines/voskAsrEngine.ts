import { Directory, File, Paths } from "expo-file-system";

import {
  ASREngine,
  ASRLanguage,
  AudioInput,
  TranscriptionResult,
} from "../types/asr.types";
import { stripFileProtocol } from "../utils/audioHelpers";
import {
  createBaseTranscriptionResult,
  createErrorTranscriptionResult,
  nowMs,
} from "../utils/metricsHelpers";

export const VOSK_MODEL_NAME = "vosk-model-small-en-us-0.15";
export const VOSK_MODEL_ASSET_DIR = `assets/models/vosk/${VOSK_MODEL_NAME}`;
export const VOSK_MODEL_DOCUMENT_DIR = `models/vosk/${VOSK_MODEL_NAME}`;
export const VOSK_MISSING_MODEL_ERROR =
  "Vosk model files are missing or not configured.";
export const VOSK_UNSUPPORTED_FINNISH_ERROR =
  "Vosk Finnish is not supported in this prototype. Vosk is configured as an English-only baseline.";

const VOSK_REQUIRED_FILES = [
  ["am", "final.mdl"],
  ["conf", "model.conf"],
  ["conf", "mfcc.conf"],
  ["graph", "HCLr.fst"],
  ["graph", "Gr.fst"],
] as const;

type VoskBinding = {
  loadModel?: (modelPath: string) => Promise<void>;
  unload?: () => void;
  transcribeFile?: (audioPath: string) => Promise<string | { text?: string }>;
};

type VoskConstructor = new () => VoskBinding;

export class VoskAsrEngine implements ASREngine {
  id = "vosk";
  name = "Vosk small EN";
  engineType = "vosk" as const;
  mode = "local-model" as const;
  languageSupport: ASRLanguage[] = ["en"];
  supportsStreaming = false;

  private recognizer: VoskBinding | null = null;
  private modelPath: string | null = null;

  async isAvailable(): Promise<boolean> {
    const hasModel = Boolean(await this.resolveModelPath());
    return hasModel && Boolean(this.getOptionalVoskConstructor());
  }

  async getReadinessStatus() {
    const modelPath = await this.resolveModelPath();
    if (!modelPath) {
      return {
        status: "model-files-missing" as const,
        message: VOSK_MISSING_MODEL_ERROR,
      };
    }

    if (!this.getOptionalVoskConstructor()) {
      return {
        status: "initialization-failed" as const,
        message:
          "Vosk native binding is not installed. Add react-native-vosk before enabling this English baseline.",
      };
    }

    return {
      status: "ready" as const,
      message: `Ready from ${modelPath}`,
    };
  }

  async initialize(): Promise<void> {
    if (this.recognizer) {
      return;
    }

    const modelPath = await this.resolveModelPath();
    if (!modelPath) {
      throw new Error(VOSK_MISSING_MODEL_ERROR);
    }

    const Vosk = this.getOptionalVoskConstructor();
    if (!Vosk) {
      throw new Error(
        "Vosk native binding is not installed. Add react-native-vosk before enabling this English baseline.",
      );
    }

    const recognizer = new Vosk();
    if (!recognizer.loadModel) {
      throw new Error(
        "Vosk native binding does not expose loadModel; this adapter cannot initialize it.",
      );
    }

    await recognizer.loadModel(modelPath);
    this.recognizer = recognizer;
    this.modelPath = modelPath;
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const startedAt = nowMs();

    try {
      if (input.language !== "en") {
        throw new Error(VOSK_UNSUPPORTED_FINNISH_ERROR);
      }

      if (!input.uri) {
        throw new Error("Vosk requires a recorded audio URI.");
      }

      await this.initialize();

      if (!this.recognizer?.transcribeFile) {
        throw new Error(
          "Vosk native binding is available, but file transcription is not exposed in this build.",
        );
      }

      const response = await this.recognizer.transcribeFile(
        stripFileProtocol(input.uri),
      );
      const transcript =
        typeof response === "string" ? response : response?.text ?? "";
      const transcriptionTimeMs = nowMs() - startedAt;

      return {
        ...createBaseTranscriptionResult(this, input, {
          transcript,
          transcriptionTimeMs,
          timeToFirstTextMs: transcript ? transcriptionTimeMs : null,
        }),
        transcript,
        transcriptionTimeMs,
        timeToFirstTextMs: transcript ? transcriptionTimeMs : null,
        error: null,
      };
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
    this.recognizer?.unload?.();
    this.recognizer = null;
    this.modelPath = null;
  }

  private async resolveModelPath() {
    const documentDir = new Directory(Paths.document, VOSK_MODEL_DOCUMENT_DIR);
    if (this.hasRequiredFiles(documentDir)) {
      return stripFileProtocol(documentDir.uri);
    }

    const bundledDir = new Directory(Paths.bundle, VOSK_MODEL_ASSET_DIR);
    if (this.hasRequiredFiles(bundledDir)) {
      return stripFileProtocol(bundledDir.uri);
    }

    return null;
  }

  private hasRequiredFiles(modelDir: Directory) {
    try {
      return VOSK_REQUIRED_FILES.every(
        (pathParts) => new File(modelDir, ...pathParts).exists,
      );
    } catch {
      return false;
    }
  }

  private getOptionalVoskConstructor(): VoskConstructor | null {
    try {
      const runtimeRequire = (globalThis as {
        require?: (moduleName: string) => unknown;
      }).require;

      if (!runtimeRequire) {
        return null;
      }

      const module = runtimeRequire("react-native-vosk") as {
        default?: VoskConstructor;
      } & VoskConstructor;

      return module.default ?? module;
    } catch {
      return null;
    }
  }
}
