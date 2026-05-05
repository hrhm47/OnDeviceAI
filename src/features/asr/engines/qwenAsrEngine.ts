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

export const QWEN3_ASR_MODEL_ID =
  "sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25";
export const QWEN3_ASR_ASSET_MODEL_DIR =
  "models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25";
export const QWEN3_ASR_DOCUMENT_MODEL_DIR =
  "models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25";
export const QWEN3_ASR_EXPECTED_PROJECT_PATH =
  "assets/models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25";
export const QWEN3_ASR_MISSING_MODEL_ERROR =
  "Qwen3-ASR model files are missing or not configured.";

type QwenModelLocation = {
  modelPath: ModelPathConfig;
  displayPath: string;
  source: "downloaded" | "document" | "asset";
};

const normalizePath = (path: string) => path.replace(/\/+$/, "");

const getPathBasename = (path: string) =>
  normalizePath(path).split("/").filter(Boolean).pop() ?? "";

const getParentPath = (path: string) =>
  normalizePath(path).split("/").slice(0, -1).join("/");

const uniquePaths = (paths: string[]) =>
  paths.filter((path, index, allPaths) => path && allPaths.indexOf(path) === index);

export class QwenAsrEngine implements ASREngine {
  id = "qwen";
  name = "Qwen3-ASR Sherpa-ONNX";
  engineType = "qwen" as const;
  mode = "local-model" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = false;
  runtimeMode = "vad-segmented-offline" as const;

  private stt: Awaited<ReturnType<typeof createSTT>> | null = null;
  private modelLocation: QwenModelLocation | null = null;

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
          message: QWEN3_ASR_MISSING_MODEL_ERROR,
        };
  }

  async initialize(): Promise<void> {
    if (this.stt) {
      return;
    }

    const modelLocation = await this.resolveModelLocation();
    if (!modelLocation) {
      throw new Error(QWEN3_ASR_MISSING_MODEL_ERROR);
    }

    this.modelLocation = modelLocation;
    this.stt = await createSTT({
      modelPath: modelLocation.modelPath,
      modelType: "qwen3_asr",
      preferInt8: true,
      numThreads: 2,
      provider: "cpu",
      modelOptions: {
        qwen3Asr: {
          maxTotalLen: 512,
          maxNewTokens: 128,
          temperature: 0.000001,
          topP: 0.8,
        },
      },
    });
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const startedAt = nowMs();

    try {
      if (!input.uri && !input.samples) {
        throw new Error("Qwen3-ASR requires recorded audio or PCM samples.");
      }

      await this.initialize();

      if (!this.stt) {
        throw new Error("Qwen3-ASR recognizer is not initialized.");
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
        isMissingQwenModelError(error) ? "unsupported" : this.runtimeMode,
      );
    }
  }

  async dispose(): Promise<void> {
    await this.stt?.destroy();
    this.stt = null;
    this.modelLocation = null;
  }

  private async resolveModelLocation(): Promise<QwenModelLocation | null> {
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

  private async resolveDownloadedModel(): Promise<QwenModelLocation | null> {
    try {
      const downloaded = await listDownloadedModelsByCategory(
        ModelCategory.Stt,
      );
      const targetModel = downloaded.find(
        (model) => model.id === QWEN3_ASR_MODEL_ID,
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

      for (const candidatePath of this.getDownloadedModelPathCandidates(localPath)) {
        const modelPath = { type: "file", path: candidatePath } satisfies ModelPathConfig;
        if (await this.isValidQwenModel(modelPath)) {
          return {
            modelPath,
            displayPath: candidatePath,
            source: "downloaded",
          };
        }
      }

      return null;
    } catch (error) {
      console.warn("Failed to resolve downloaded Qwen3-ASR model", error);
      return null;
    }
  }

  private async resolveDocumentModel(): Promise<QwenModelLocation | null> {
    try {
      const modelDir = new Directory(Paths.document, QWEN3_ASR_DOCUMENT_MODEL_DIR);
      const basePath = stripFileProtocol(modelDir.uri);

      for (const candidatePath of this.getModelPathCandidates(basePath)) {
        const modelPath = {
          type: "file",
          path: candidatePath,
        } satisfies ModelPathConfig;

        if (await this.isValidQwenModel(modelPath)) {
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

  private async resolveBundledAssetModel(): Promise<QwenModelLocation | null> {
    const modelPath = {
      type: "asset",
      path: QWEN3_ASR_ASSET_MODEL_DIR,
    } satisfies ModelPathConfig;

    return (await this.isValidQwenModel(modelPath))
      ? {
          modelPath,
          displayPath: QWEN3_ASR_EXPECTED_PROJECT_PATH,
          source: "asset",
        }
      : null;
  }

  private async isValidQwenModel(modelPath: ModelPathConfig) {
    try {
      if (modelPath.type === "file" && !(await hasRequiredQwenFiles(modelPath.path))) {
        return false;
      }

      const detected = await detectSttModel(modelPath, {
        modelType: "qwen3_asr",
        preferInt8: true,
      });

      return (
        detected.success &&
        detected.detectedModels.some((model) => model.type === "qwen3_asr")
      );
    } catch {
      return false;
    }
  }

  private getDownloadedModelPathCandidates(localPath: string) {
    const normalizedPath = normalizePath(localPath);
    const parentPath = getParentPath(normalizedPath);
    const pathName = getPathBasename(normalizedPath);
    const parentName = getPathBasename(parentPath);

    return uniquePaths([
      pathName === QWEN3_ASR_MODEL_ID && parentName === QWEN3_ASR_MODEL_ID
        ? parentPath
        : "",
      ...this.getModelPathCandidates(normalizedPath),
    ]);
  }

  private getModelPathCandidates(basePath: string) {
    const normalizedPath = normalizePath(basePath);
    return uniquePaths([
      normalizedPath,
      `${normalizedPath}/${QWEN3_ASR_MODEL_ID}`,
    ]);
  }

  private async prepareAudioFileForSherpa(uri: string) {
    const inputPath = stripFileProtocol(uri);
    if (inputPath.toLowerCase().endsWith(".wav")) {
      return inputPath;
    }

    const outputFile = new File(
      Paths.cache,
      `qwen-asr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`,
    );
    const outputPath = stripFileProtocol(outputFile.uri);

    try {
      await convertAudioToWav16k(inputPath, outputPath);
      return outputPath;
    } catch (error) {
      throw new Error(
        `Qwen3-ASR audio conversion failed. Sherpa-ONNX needs WAV/PCM-compatible audio. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

const isMissingQwenModelError = (error: unknown) =>
  error instanceof Error && error.message === QWEN3_ASR_MISSING_MODEL_ERROR;

const hasRequiredQwenFiles = async (basePath: string) => {
  const normalizedPath = normalizePath(basePath);
  const requiredFiles = [
    "conv_frontend.onnx",
    "encoder.int8.onnx",
    "decoder.int8.onnx",
  ];

  for (const fileName of requiredFiles) {
    const file = new File(`${normalizedPath}/${fileName}`);
    if (!file.exists) {
      return false;
    }
  }

  const tokenizer = new Directory(`${normalizedPath}/tokenizer`);
  return tokenizer.exists;
};
