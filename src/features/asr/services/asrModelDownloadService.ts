import * as FileSystem from "expo-file-system/legacy";
import {
  ensureModelByCategory,
  getLocalModelPathByCategory,
  ModelCategory,
  refreshModelsByCategory,
} from "react-native-sherpa-onnx/download";
import { extractArchive } from "react-native-sherpa-onnx/extraction";

import {
  PARAKEET_DOCUMENT_MODEL_DIR,
  PARAKEET_MODEL_ID,
} from "../engines/parakeetAsrEngine";
import {
  QWEN3_ASR_DOCUMENT_MODEL_DIR,
  QWEN3_ASR_MODEL_ID,
} from "../engines/qwenAsrEngine";
import { stripFileProtocol } from "../utils/audioHelpers";

export const QWEN3_ASR_DOWNLOAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25.tar.bz2";
export const SILERO_VAD_MODEL_ID = "silero_vad";
export const SILERO_VAD_FILE_NAME = "silero_vad.onnx";
export const SILERO_VAD_DOWNLOAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx";
export const QWEN3_ASR_VAD_DOWNLOAD_URL = SILERO_VAD_DOWNLOAD_URL;
export const PARAKEET_DOWNLOAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2";
export const PARAKEET_MODEL_DOWNLOAD_CONFIG = {
  modelId: PARAKEET_MODEL_ID,
  archiveType: "tar.bz2",
  downloadUrl: PARAKEET_DOWNLOAD_URL,
} as const;
export const SILERO_VAD_DOWNLOAD_CONFIG = {
  modelId: SILERO_VAD_MODEL_ID,
  archiveType: "onnx",
  downloadUrl: SILERO_VAD_DOWNLOAD_URL,
  fileName: SILERO_VAD_FILE_NAME,
} as const;

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

export const downloadParakeetAsrModel = async (options?: DownloadOptions) => {
  emitProgress(options, {
    phase: "refreshing",
    percent: 0,
    message: "Refreshing Sherpa-ONNX model registry",
  });

  try {
    await refreshModelsByCategory(ModelCategory.Stt, { forceRefresh: true });
    const result = await ensureModelByCategory(ModelCategory.Stt, PARAKEET_MODEL_ID, {
      deleteArchiveAfterExtract: true,
      onProgress: (progress) => {
        emitProgress(options, {
          phase: progress.phase === "extracting" ? "extracting" : "downloading",
          percent: progress.percent,
          message:
            progress.phase === "extracting"
              ? "Extracting Parakeet model"
              : "Downloading Parakeet model",
        });
      },
    });

    emitProgress(options, {
      phase: "ready",
      percent: 100,
      message: "Parakeet model is ready",
    });
    return result.localPath;
  } catch (registryError) {
    console.warn(
      "Sherpa-ONNX model manager download failed; falling back to direct URL",
      registryError,
    );
    return downloadParakeetAsrModelFromDirectUrl(options);
  }
};

export const downloadSharedSileroVadModel = async (options?: DownloadOptions) => {
  emitProgress(options, {
    phase: "refreshing",
    percent: 0,
    message: "Refreshing Sherpa-ONNX VAD model registry",
  });

  try {
    await refreshModelsByCategory(ModelCategory.Vad, { forceRefresh: true });
    const result = await ensureModelByCategory(ModelCategory.Vad, SILERO_VAD_MODEL_ID, {
      onProgress: (progress) => {
        emitProgress(options, {
          phase: "downloading",
          percent: progress.percent,
          message: "Downloading shared Silero VAD model",
        });
      },
    });

    emitProgress(options, {
      phase: "ready",
      percent: 100,
      message: "Shared Silero VAD model is ready",
    });
    return getSileroVadModelFilePath(result.localPath);
  } catch (registryError) {
    console.warn(
      "Sherpa-ONNX VAD model manager download failed; falling back to direct URL",
      registryError,
    );
    return downloadSharedSileroVadModelFromDirectUrl(options);
  }
};

export const resolveSharedSileroVadModelPath = async () => {
  const downloadedPath = await getLocalModelPathByCategory(
    ModelCategory.Vad,
    SILERO_VAD_MODEL_ID,
  ).catch(() => null);
  const downloadedFilePath = downloadedPath
    ? getSileroVadModelFilePath(downloadedPath)
    : null;

  if (downloadedFilePath && await fileExists(downloadedFilePath)) {
    return downloadedFilePath;
  }

  const directFilePath = getDirectSileroVadModelFilePath();
  if (directFilePath && await fileExists(directFilePath)) {
    return directFilePath;
  }

  return null;
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

const downloadSharedSileroVadModelFromDirectUrl = async (options?: DownloadOptions) => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for VAD model download.");
  }

  const vadModelDir = `${documentDirectory}sherpa-onnx/models/vad/${SILERO_VAD_MODEL_ID}/`;
  const modelUri = `${vadModelDir}${SILERO_VAD_FILE_NAME}`;

  await FileSystem.makeDirectoryAsync(vadModelDir, { intermediates: true });

  emitProgress(options, {
    phase: "downloading",
    percent: 0,
    message: "Downloading shared Silero VAD model from GitHub release",
  });

  const downloadTask = FileSystem.createDownloadResumable(
    SILERO_VAD_DOWNLOAD_URL,
    modelUri,
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
        message: "Downloading shared Silero VAD model from GitHub release",
      });
    },
  );

  const downloaded = await downloadTask.downloadAsync();
  if (!downloaded?.uri) {
    throw new Error("Shared Silero VAD model download did not complete.");
  }

  const now = new Date().toISOString();
  await FileSystem.writeAsStringAsync(`${vadModelDir}.ready`, "ready");
  await FileSystem.writeAsStringAsync(
    `${vadModelDir}manifest.json`,
    JSON.stringify({
      downloadedAt: now,
      lastUsed: now,
      model: {
        id: SILERO_VAD_MODEL_ID,
        displayName: "Silero VAD",
        downloadUrl: SILERO_VAD_DOWNLOAD_URL,
        archiveExt: "onnx",
        bytes: 0,
        category: ModelCategory.Vad,
      },
    }),
  );

  emitProgress(options, {
    phase: "ready",
    percent: 100,
    message: "Shared Silero VAD model is ready",
  });

  return stripFileProtocol(modelUri);
};

const downloadParakeetAsrModelFromDirectUrl = async (options?: DownloadOptions) => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for model download.");
  }

  const downloadsDir = `${documentDirectory}downloads/`;
  const parakeetModelsDir = `${documentDirectory}models/parakeet/`;
  const archiveUri = `${downloadsDir}${PARAKEET_MODEL_ID}.tar.bz2`;

  await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(parakeetModelsDir, { intermediates: true });

  emitProgress(options, {
    phase: "downloading",
    percent: 0,
    message: "Downloading Parakeet model from GitHub release",
  });

  const downloadTask = FileSystem.createDownloadResumable(
    PARAKEET_DOWNLOAD_URL,
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
        message: "Downloading Parakeet model from GitHub release",
      });
    },
  );

  const downloaded = await downloadTask.downloadAsync();
  if (!downloaded?.uri) {
    throw new Error("Parakeet model download did not complete.");
  }

  emitProgress(options, {
    phase: "extracting",
    percent: 0,
    message: "Extracting Parakeet model",
  });

  await extractArchive(
    {
      modelId: PARAKEET_MODEL_ID,
      archivePath: stripFileProtocol(downloaded.uri),
      format: PARAKEET_MODEL_DOWNLOAD_CONFIG.archiveType,
    },
    stripFileProtocol(parakeetModelsDir),
    {
      force: true,
      onProgress: (progress: { percent: number }) => {
        emitProgress(options, {
          phase: "extracting",
          percent: progress.percent,
          message: "Extracting Parakeet model",
        });
      },
    },
  );

  emitProgress(options, {
    phase: "ready",
    percent: 100,
    message: "Parakeet model is ready",
  });

  return `${stripFileProtocol(documentDirectory)}${PARAKEET_DOCUMENT_MODEL_DIR}`;
};

const getSileroVadModelFilePath = (localPath: string) =>
  localPath.endsWith(".onnx")
    ? localPath
    : `${localPath.replace(/\/+$/, "")}/${SILERO_VAD_FILE_NAME}`;

const getDirectSileroVadModelFilePath = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    return null;
  }

  return stripFileProtocol(
    `${documentDirectory}sherpa-onnx/models/vad/${SILERO_VAD_MODEL_ID}/${SILERO_VAD_FILE_NAME}`,
  );
};

const fileExists = async (path: string) => {
  const info = await FileSystem.getInfoAsync(path.startsWith("file://") ? path : `file://${path}`);
  return info.exists;
};
