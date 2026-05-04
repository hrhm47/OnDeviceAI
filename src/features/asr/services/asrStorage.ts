import { Directory, File, Paths } from "expo-file-system";

import { TranscriptionResult } from "../types/asr.types";

const STORAGE_DIR_NAME = "asr-results";
const STORAGE_FILE_NAME = "results.json";

const getStorageFile = () => {
  const dir = new Directory(Paths.document, STORAGE_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  return new File(dir, STORAGE_FILE_NAME);
};

export const getAsrResults = async (): Promise<TranscriptionResult[]> => {
  const file = getStorageFile();
  if (!file.exists) {
    return [];
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read ASR results", error);
    return [];
  }
};

export const saveAsrResult = async (result: TranscriptionResult) => {
  const file = getStorageFile();
  const results = await getAsrResults();
  file.write(JSON.stringify([result, ...results], null, 2));
};

export const clearAsrResults = async () => {
  const file = getStorageFile();
  if (file.exists) {
    file.write("[]");
  }
};
