import * as FileSystem from "expo-file-system/legacy";

import type { Phase3NativeASRResult } from "./nativeASRPhase3.types";

const STORAGE_DIR_NAME = "phase3-native-ios-asr";
const RESULTS_FILE_NAME = "native-asr-results.json";
const CSV_FILE_NAME = "native-asr-results-export.csv";

export const PHASE3_NATIVE_ASR_CSV_FIELDS = [
  "resultId",
  "timestamp",
  "testCaseId",
  "sessionId",
  "modelId",
  "modelName",
  "engineType",
  "language",
  "locale",
  "configId",
  "referenceText",
  "rawTranscript",
  "finalTranscript",
  "normalizedTranscript",
  "improvedTranscript",
  "rawWER",
  "rawCER",
  "improvedWER",
  "improvedCER",
  "shouldReportPartialResults",
  "partialTranscriptsCount",
  "taskHint",
  "contextualStringsEnabled",
  "contextualStringsCount",
  "addsPunctuation",
  "addsPunctuationApplied",
  "onDevicePolicy",
  "supportsOnDeviceRecognition",
  "requestedRequiresOnDeviceRecognition",
  "recognitionPrivacyMode",
  "recognizerAvailable",
  "recordingDurationMs",
  "ttfsMs",
  "finalLatencyMs",
  "transcriptionTimeMs",
  "realTimeFactor",
  "audioSessionCategory",
  "audioSessionMode",
  "sampleRate",
  "success",
  "errorMessage",
  "notes",
] as const;

let resultSaveQueue: Promise<void> = Promise.resolve();

const getStoragePaths = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for Phase 3 ASR testing.");
  }

  const storageDir = `${documentDirectory}${STORAGE_DIR_NAME}/`;
  return {
    storageDir,
    resultsFile: `${storageDir}${RESULTS_FILE_NAME}`,
    csvFile: `${storageDir}${CSV_FILE_NAME}`,
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

export const savePhase3NativeASRResult = async (
  result: Phase3NativeASRResult,
) => {
  resultSaveQueue = resultSaveQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureStorageDir();
      const { resultsFile } = getStoragePaths();
      const results = await getPhase3NativeASRResults();
      await FileSystem.writeAsStringAsync(
        resultsFile,
        JSON.stringify([result, ...results], null, 2),
      );
    });

  return resultSaveQueue;
};

export const getPhase3NativeASRResults = async (): Promise<
  Phase3NativeASRResult[]
> => {
  await ensureStorageDir();
  const { resultsFile } = getStoragePaths();
  return readJsonArray<Phase3NativeASRResult>(resultsFile);
};

export const clearPhase3NativeASRResults = async () => {
  await ensureStorageDir();
  const { resultsFile } = getStoragePaths();
  await FileSystem.writeAsStringAsync(resultsFile, JSON.stringify([], null, 2));
};

export const exportPhase3NativeASRResultsCsv = async () => {
  await ensureStorageDir();
  const { csvFile } = getStoragePaths();
  const results = await getPhase3NativeASRResults();
  const csv = buildPhase3NativeASRResultsCsv(results);
  await FileSystem.writeAsStringAsync(csvFile, csv);
  return csvFile;
};

export const buildPhase3NativeASRResultsCsv = (
  results: Phase3NativeASRResult[],
) => {
  const rows = results.map((result) =>
    PHASE3_NATIVE_ASR_CSV_FIELDS.map((field) =>
      escapeCsvValue(result[field]),
    ).join(","),
  );

  return [PHASE3_NATIVE_ASR_CSV_FIELDS.join(","), ...rows].join("\n");
};

const readJsonArray = async <T,>(fileUri: string): Promise<T[]> => {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    return [];
  }

  try {
    const text = await FileSystem.readAsStringAsync(fileUri);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read Phase 3 Native ASR storage", error);
    return [];
  }
};

const escapeCsvValue = (
  value: string | number | boolean | string[] | null | undefined,
) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) ? value.join(" | ") : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
