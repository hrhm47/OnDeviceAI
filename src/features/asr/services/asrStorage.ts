import * as FileSystem from "expo-file-system/legacy";

import { TranscriptionResult } from "../types/asr.types";

const STORAGE_DIR_NAME = "asr-results";
const STORAGE_FILE_NAME = "results.json";

let saveQueue: Promise<void> = Promise.resolve();

const getStoragePaths = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for ASR result storage.");
  }

  const storageDir = `${documentDirectory}${STORAGE_DIR_NAME}/`;
  return {
    storageDir,
    storageFile: `${storageDir}${STORAGE_FILE_NAME}`,
  };
};

const ensureStorageDir = async () => {
  const { storageDir } = getStoragePaths();
  await FileSystem.makeDirectoryAsync(storageDir, { intermediates: true }).catch(
    async (error) => {
      const info = await FileSystem.getInfoAsync(storageDir);
      if (!info.exists) {
        throw error;
      }
    },
  );
};

export const getAsrResults = async (): Promise<TranscriptionResult[]> => {
  await ensureStorageDir();
  const { storageFile } = getStoragePaths();
  const fileInfo = await FileSystem.getInfoAsync(storageFile);
  if (!fileInfo.exists) {
    return [];
  }

  try {
    const text = await FileSystem.readAsStringAsync(storageFile);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read ASR results", error);
    return [];
  }
};

export const saveAsrResult = async (result: TranscriptionResult) => {
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureStorageDir();
      const { storageFile } = getStoragePaths();
      const results = await getAsrResults();
      await FileSystem.writeAsStringAsync(
        storageFile,
        JSON.stringify([result, ...results], null, 2),
      );
    });

  return saveQueue;
};

export const clearAsrResults = async () => {
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureStorageDir();
      const { storageFile } = getStoragePaths();
      await FileSystem.writeAsStringAsync(storageFile, "[]");
    });

  return saveQueue;
};
