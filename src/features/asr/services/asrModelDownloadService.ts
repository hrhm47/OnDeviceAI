import * as FileSystem from "expo-file-system/legacy";
import {
  ensureModelByCategory,
  ModelCategory,
  refreshModelsByCategory,
} from "react-native-sherpa-onnx/download";
import { extractArchive } from "react-native-sherpa-onnx/extraction";

import {
  QWEN3_ASR_DOCUMENT_MODEL_DIR,
  QWEN3_ASR_MODEL_ID,
} from "../engines/qwenAsrEngine";
import { stripFileProtocol } from "../utils/audioHelpers";

export const QWEN3_ASR_DOWNLOAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25.tar.bz2";
export const QWEN3_ASR_VAD_DOWNLOAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx";

export type AsrModelDownloadPhase =
  | "refreshing"
  | "downloading"
  | "extracting"
  | "ready";

export type AsrModelDownloadProgress = {
  phase: AsrModelDownloadPhase;
  percent: number;
  message: string;
};

type DownloadOptions = {
  onProgress?: (progress: AsrModelDownloadProgress) => void;
};

const emitProgress = (
  options: DownloadOptions | undefined,
  progress: AsrModelDownloadProgress,
) => {
  options?.onProgress?.(progress);
};

export const downloadQwen3AsrModel = async (options?: DownloadOptions) => {
  emitProgress(options, {
    phase: "refreshing",
    percent: 0,
    message: "Refreshing Sherpa-ONNX model registry",
  });

  try {
    await refreshModelsByCategory(ModelCategory.Stt, { forceRefresh: true });
    const result = await ensureModelByCategory(ModelCategory.Stt, QWEN3_ASR_MODEL_ID, {
      deleteArchiveAfterExtract: true,
      onProgress: (progress) => {
        emitProgress(options, {
          phase: progress.phase === "extracting" ? "extracting" : "downloading",
          percent: progress.percent,
          message:
            progress.phase === "extracting"
              ? "Extracting Qwen3-ASR model"
              : "Downloading Qwen3-ASR model",
        });
      },
    });

    emitProgress(options, {
      phase: "ready",
      percent: 100,
      message: "Qwen3-ASR model is ready",
    });
    return result.localPath;
  } catch (registryError) {
    console.warn(
      "Sherpa-ONNX model manager download failed; falling back to direct URL",
      registryError,
    );
    return downloadQwen3AsrModelFromDirectUrl(options);
  }
};

const downloadQwen3AsrModelFromDirectUrl = async (options?: DownloadOptions) => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for model download.");
  }

  const downloadsDir = `${documentDirectory}downloads/`;
  const qwenModelsDir = `${documentDirectory}models/qwen/`;
  const archiveUri = `${downloadsDir}${QWEN3_ASR_MODEL_ID}.tar.bz2`;

  await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(qwenModelsDir, { intermediates: true });

  emitProgress(options, {
    phase: "downloading",
    percent: 0,
    message: "Downloading Qwen3-ASR model from GitHub release",
  });

  const downloadTask = FileSystem.createDownloadResumable(
    QWEN3_ASR_DOWNLOAD_URL,
    archiveUri,
    {},
    (progress) => {
      const total = progress.totalBytesExpectedToWrite || 0;
      const percent =
        total > 0
          ? (progress.totalBytesWritten / total) * 100
          : 0;

      emitProgress(options, {
        phase: "downloading",
        percent,
        message: "Downloading Qwen3-ASR model from GitHub release",
      });
    },
  );

  const downloaded = await downloadTask.downloadAsync();
  if (!downloaded?.uri) {
    throw new Error("Qwen3-ASR model download did not complete.");
  }

  emitProgress(options, {
    phase: "extracting",
    percent: 0,
    message: "Extracting Qwen3-ASR model",
  });

  await extractArchive(
    {
      modelId: QWEN3_ASR_MODEL_ID,
      archivePath: stripFileProtocol(downloaded.uri),
      format: "tar.bz2",
    },
    stripFileProtocol(qwenModelsDir),
    {
      force: true,
      onProgress: (progress: { percent: number }) => {
        emitProgress(options, {
          phase: "extracting",
          percent: progress.percent,
          message: "Extracting Qwen3-ASR model",
        });
      },
    },
  );

  emitProgress(options, {
    phase: "ready",
    percent: 100,
    message: "Qwen3-ASR model is ready",
  });

  return `${stripFileProtocol(documentDirectory)}${QWEN3_ASR_DOCUMENT_MODEL_DIR}`;
};
