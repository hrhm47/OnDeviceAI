import { Directory, File, Paths } from "expo-file-system";
import type { ModelPathConfig } from "react-native-sherpa-onnx";
import { convertAudioToWav16k } from "react-native-sherpa-onnx/audio";
import {
  getLocalModelPathByCategory,
  listDownloadedModelsByCategory,
  ModelCategory,
} from "react-native-sherpa-onnx/download";
import { createSTT, detectSttModel } from "react-native-sherpa-onnx/stt";

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

export const PARAKEET_MODEL_ID =
  "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_ASSET_MODEL_DIR =
  "models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_DOCUMENT_MODEL_DIR =
  "models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_EXPECTED_PROJECT_PATH =
  "assets/models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8";
export const PARAKEET_MISSING_MODEL_ERROR =
  "Parakeet model files are missing or not configured.";

type ParakeetModelLocation = {
  modelPath: ModelPathConfig;
  displayPath: string;
  source: "downloaded" | "document" | "asset";
};

const normalizePath = (path: string) => path.replace(/\/+$/, "");
const uniquePaths = (paths: string[]) =>
  paths.filter((path, index, allPaths) => path && allPaths.indexOf(path) === index);

export class ParakeetAsrEngine implements ASREngine {
  id = "parakeet";
  name = "Parakeet TDT Sherpa-ONNX";
  engineType = "parakeet" as const;
  mode = "local-model" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = false;
  runtimeMode = "vad-segmented-offline" as const;

  private stt: Awaited<ReturnType<typeof createSTT>> | null = null;

  async isAvailable(): Promise<boolean> {
    return Boolean(await this.resolveModelLocation());
  }

  async getReadinessStatus() {
    const modelLocation = await this.resolveModelLocation();
    return modelLocation
      ? {
          status: "ready" as const,
          message: `Ready from ${modelLocation.source}: ${modelLocation.displayPath}`,
        }
      : {
          status: "model-files-missing" as const,
          message: PARAKEET_MISSING_MODEL_ERROR,
        };
  }

  async initialize(): Promise<void> {
    if (this.stt) {
      return;
    }

    const modelLocation = await this.resolveModelLocation();
    if (!modelLocation) {
      throw new Error(PARAKEET_MISSING_MODEL_ERROR);
    }

    this.stt = await createSTT({
      modelPath: modelLocation.modelPath,
      modelType: "auto",
      preferInt8: true,
      numThreads: 2,
      provider: "cpu",
    });
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const startedAt = nowMs();

    try {
      if (!input.uri && !input.samples) {
        throw new Error("Parakeet requires recorded audio or PCM samples.");
      }

      await this.initialize();

      if (!this.stt) {
        throw new Error("Parakeet recognizer is not initialized.");
      }

      const audioPath = input.uri
        ? await this.prepareAudioFileForSherpa(input.uri)
        : null;
      const response = input.samples
        ? await this.stt.transcribeSamples(
            Array.from(input.samples),
            input.sampleRate ?? 16000,
          )
        : await this.stt.transcribeFile(audioPath!);
      const transcript = response.text ?? "";
      const transcriptionTimeMs = nowMs() - startedAt;

      return createBaseTranscriptionResult(this, input, {
        transcript,
        transcriptionTimeMs,
        timeToFirstTextMs: transcript ? transcriptionTimeMs : null,
        runtimeMode: input.segmentId
          ? "vad-segmented-offline"
          : "offline-full-recording",
        segmentCount: input.segmentId ? 1 : undefined,
      });
    } catch (error) {
      return createErrorTranscriptionResult(
        this,
        input,
        error,
        nowMs() - startedAt,
        isMissingParakeetModelError(error) ? "unsupported" : this.runtimeMode,
      );
    }
  }

  async dispose(): Promise<void> {
    await this.stt?.destroy();
    this.stt = null;
  }

  private async resolveModelLocation(): Promise<ParakeetModelLocation | null> {
    const downloadedLocation = await this.resolveDownloadedModel();
    if (downloadedLocation) {
      return downloadedLocation;
    }

    const documentLocation = await this.resolveDocumentModel();
    if (documentLocation) {
      return documentLocation;
    }

    return this.resolveBundledAssetModel();
  }

  private async resolveDownloadedModel(): Promise<ParakeetModelLocation | null> {
    try {
      const downloaded = await listDownloadedModelsByCategory(ModelCategory.Stt);
      const targetModel = downloaded.find(
        (model) => model.id === PARAKEET_MODEL_ID,
      );

      if (!targetModel) {
        return null;
      }

      const localPath = await getLocalModelPathByCategory(
        ModelCategory.Stt,
        targetModel.id,
      );

      if (!localPath) {
        return null;
      }

      for (const candidatePath of this.getModelPathCandidates(localPath)) {
        const modelPath = { type: "file", path: candidatePath } satisfies ModelPathConfig;
        if (await this.isValidParakeetModel(modelPath)) {
          return {
            modelPath,
            displayPath: candidatePath,
            source: "downloaded",
          };
        }
      }

      return null;
    } catch (error) {
      console.warn("Failed to resolve downloaded Parakeet model", error);
      return null;
    }
  }

  private async resolveDocumentModel(): Promise<ParakeetModelLocation | null> {
    try {
      const modelDir = new Directory(Paths.document, PARAKEET_DOCUMENT_MODEL_DIR);
      const basePath = stripFileProtocol(modelDir.uri);

      for (const candidatePath of this.getModelPathCandidates(basePath)) {
        const modelPath = { type: "file", path: candidatePath } satisfies ModelPathConfig;
        if (await this.isValidParakeetModel(modelPath)) {
          return {
            modelPath,
            displayPath: candidatePath,
            source: "document",
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async resolveBundledAssetModel(): Promise<ParakeetModelLocation | null> {
    const modelPath = {
      type: "asset",
      path: PARAKEET_ASSET_MODEL_DIR,
    } satisfies ModelPathConfig;

    return (await this.isValidParakeetModel(modelPath))
      ? {
          modelPath,
          displayPath: PARAKEET_EXPECTED_PROJECT_PATH,
          source: "asset",
        }
      : null;
  }

  private async isValidParakeetModel(modelPath: ModelPathConfig) {
    try {
      const detected = await detectSttModel(modelPath, {
        modelType: "auto",
        preferInt8: true,
      });

      return (
        detected.success &&
        detected.detectedModels.some((model) =>
          model.type.includes("nemo") || model.type.includes("transducer"),
        )
      );
    } catch {
      return false;
    }
  }

  private getModelPathCandidates(basePath: string) {
    const normalizedPath = normalizePath(basePath);
    return uniquePaths([
      normalizedPath,
      `${normalizedPath}/${PARAKEET_MODEL_ID}`,
    ]);
  }

  private async prepareAudioFileForSherpa(uri: string) {
    const inputPath = stripFileProtocol(uri);
    if (inputPath.toLowerCase().endsWith(".wav")) {
      return inputPath;
    }

    const outputFile = new File(
      Paths.cache,
      `parakeet-asr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`,
    );
    const outputPath = stripFileProtocol(outputFile.uri);

    try {
      await convertAudioToWav16k(inputPath, outputPath);
      return outputPath;
    } catch (error) {
      throw new Error(
        `Parakeet audio conversion failed. Sherpa-ONNX needs WAV/PCM-compatible audio. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

const isMissingParakeetModelError = (error: unknown) =>
  error instanceof Error && error.message === PARAKEET_MISSING_MODEL_ERROR;
