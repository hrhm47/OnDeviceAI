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

export const PARAKEET_ENGINE_ID = "parakeet-tdt-0.6b-v3-int8";
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

const getPathBasename = (path: string) =>
  normalizePath(path).split("/").filter(Boolean).pop() ?? "";

const getParentPath = (path: string) =>
  normalizePath(path).split("/").slice(0, -1).join("/");

const uniquePaths = (paths: string[]) =>
  paths.filter((path, index, allPaths) => path && allPaths.indexOf(path) === index);

export class ParakeetAsrEngine implements ASREngine {
  id = PARAKEET_ENGINE_ID;
  name = "NVIDIA Parakeet TDT 0.6B v3 INT8";
  engineType = "parakeet" as const;
  mode = "local-model" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = false;
  runtimeMode = "vad-segmented-offline" as const;

  private stt: Awaited<ReturnType<typeof createSTT>> | null = null;
  private modelLocation: ParakeetModelLocation | null = null;

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

    this.modelLocation = modelLocation;
    this.stt = await createSTT({
      modelPath: modelLocation.modelPath,
      modelType: "nemo_transducer",
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

      const response = input.samples
        ? await this.transcribeSamples(input.samples, input.sampleRate ?? 16000)
        : await this.transcribeFile(input.uri!);
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

  async transcribeFile(wavPath: string) {
    await this.initialize();

    if (!this.stt) {
      throw new Error("Parakeet recognizer is not initialized.");
    }

    const audioPath = await this.prepareAudioFileForSherpa(wavPath);
    return this.stt.transcribeFile(audioPath);
  }

  async transcribeSamples(samples: Float32Array, sampleRate: number) {
    const wavPath = await this.writeSamplesToWav16k(samples, sampleRate);
    return this.transcribeFile(wavPath);
  }

  async dispose(): Promise<void> {
    await this.stt?.destroy();
    this.stt = null;
    this.modelLocation = null;
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
      const downloaded = await listDownloadedModelsByCategory(
        ModelCategory.Stt,
      );
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

      for (const candidatePath of this.getDownloadedModelPathCandidates(localPath)) {
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
        const modelPath = {
          type: "file",
          path: candidatePath,
        } satisfies ModelPathConfig;

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
      if (
        modelPath.type === "file" &&
        !(await hasRequiredParakeetFiles(modelPath.path))
      ) {
        return false;
      }

      const detected = await detectSttModel(modelPath, {
        modelType: "nemo_transducer",
        preferInt8: true,
      });

      return (
        detected.success &&
        detected.detectedModels.some((model) => model.type === "nemo_transducer")
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
      pathName === PARAKEET_MODEL_ID && parentName === PARAKEET_MODEL_ID
        ? parentPath
        : "",
      ...this.getModelPathCandidates(normalizedPath),
    ]);
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
        `Parakeet audio conversion failed. Sherpa-ONNX works best with mono 16-bit PCM WAV audio at 16 kHz. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async writeSamplesToWav16k(samples: Float32Array, sampleRate: number) {
    const outputFile = new File(
      Paths.cache,
      `parakeet-segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`,
    );
    const wavBytes = encodeMonoPcm16Wav(
      sampleRate === 16000 ? samples : resampleLinear(samples, sampleRate, 16000),
      16000,
    );

    outputFile.write(wavBytes);
    return stripFileProtocol(outputFile.uri);
  }
}

const isMissingParakeetModelError = (error: unknown) =>
  error instanceof Error && error.message === PARAKEET_MISSING_MODEL_ERROR;

const hasRequiredParakeetFiles = async (basePath: string) => {
  const normalizedPath = normalizePath(basePath);
  const requiredFiles = [
    "encoder.int8.onnx",
    "decoder.int8.onnx",
    "joiner.int8.onnx",
    "tokens.txt",
  ];

  for (const fileName of requiredFiles) {
    const file = new File(`${normalizedPath}/${fileName}`);
    if (!file.exists) {
      return false;
    }
  }

  return true;
};

const resampleLinear = (
  samples: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
) => {
  if (inputSampleRate <= 0 || inputSampleRate === outputSampleRate) {
    return samples;
  }

  const outputLength = Math.max(
    1,
    Math.round((samples.length * outputSampleRate) / inputSampleRate),
  );
  const output = new Float32Array(outputLength);
  const ratio = inputSampleRate / outputSampleRate;

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1);
    const fraction = sourceIndex - leftIndex;
    const left = samples[leftIndex] ?? 0;
    const right = samples[rightIndex] ?? left;
    output[index] = left + (right - left) * fraction;
  }

  return output;
};

const encodeMonoPcm16Wav = (samples: Float32Array, sampleRate: number) => {
  const dataSize = samples.length * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);

  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, Math.round(pcm), true);
    offset += 2;
  }

  return bytes;
};

const writeAscii = (bytes: Uint8Array, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
};
