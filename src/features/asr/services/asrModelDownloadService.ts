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
import {
  VOSK_MODEL_DOCUMENT_DIR,
  VOSK_MODEL_NAME,
} from "../engines/voskAsrEngine";
import { stripFileProtocol } from "../utils/audioHelpers";

export const QWEN3_ASR_DOWNLOAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25.tar.bz2";
export const QWEN3_ASR_VAD_DOWNLOAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx";
export const VOSK_SMALL_EN_DOWNLOAD_URL =
  "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip";
export const VOSK_MODEL_LIST_URL = "https://alphacephei.com/vosk/models";

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

export const downloadVoskSmallEnModel = async (options?: DownloadOptions) => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for model download.");
  }

  const unzip = getZipArchiveUnzip();
  if (!unzip) {
    throw new Error(
      "react-native-zip-archive is installed in package.json, but its native module is not available in this app build. Rebuild the dev app, then try the Vosk download again.",
    );
  }

  const downloadsDir = `${documentDirectory}downloads/`;
  const voskModelsRootDir = `${documentDirectory}models/vosk/`;
  const voskModelDir = `${documentDirectory}${VOSK_MODEL_DOCUMENT_DIR}`;
  const archiveUri = `${downloadsDir}${VOSK_MODEL_NAME}.zip`;

  await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(voskModelsRootDir, { intermediates: true });

  let downloadedUri = archiveUri;
  const archiveInfo = await FileSystem.getInfoAsync(archiveUri);
  if (archiveInfo.exists) {
    emitProgress(options, {
      phase: "downloading",
      percent: 100,
      message: "Using downloaded Vosk ZIP",
    });
  } else {
    emitProgress(options, {
      phase: "downloading",
      percent: 0,
      message: "Downloading Vosk English model",
    });

    const downloadTask = FileSystem.createDownloadResumable(
      VOSK_SMALL_EN_DOWNLOAD_URL,
      archiveUri,
      {},
      (progress) => {
        const total = progress.totalBytesExpectedToWrite || 0;
        const percent =
          total > 0 ? (progress.totalBytesWritten / total) * 100 : 0;

        emitProgress(options, {
          phase: "downloading",
          percent,
          message: "Downloading Vosk English model",
        });
      },
    );

    const downloaded = await downloadTask.downloadAsync();
    if (!downloaded?.uri) {
      throw new Error("Vosk model download did not complete.");
    }
    downloadedUri = downloaded.uri;
  }

  emitProgress(options, {
    phase: "extracting",
    percent: 0,
    message: "Extracting Vosk English model",
  });

  await FileSystem.deleteAsync(voskModelDir, { idempotent: true }).catch(
    () => undefined,
  );
  await unzip(stripFileProtocol(downloadedUri), stripFileProtocol(voskModelsRootDir));

  emitProgress(options, {
    phase: "ready",
    percent: 100,
    message: "Vosk English model is ready",
  });

  return stripFileProtocol(voskModelDir);
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

export const getVoskInstallInstructions = () =>
  `Download ${VOSK_MODEL_NAME} from ${VOSK_SMALL_EN_DOWNLOAD_URL}. The app stores the extracted folder at ${VOSK_MODEL_DOCUMENT_DIR}.`;

type UnzipFunction = (sourcePath: string, targetPath: string, charset?: string) => Promise<string>;

const getZipArchiveUnzip = (): UnzipFunction | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require("react-native-zip-archive") as {
      unzip?: UnzipFunction;
    };

    return typeof module.unzip === "function" ? module.unzip : null;
  } catch (error) {
    console.warn("react-native-zip-archive is not available in this native build", error);
    return null;
  }
};
