import * as FileSystem from "expo-file-system/legacy";

import type { Phase4ExtractionResult } from "../draft/phase4TaskDraftBuilder";
import { buildPhase4ExtractionResultsCsv } from "./phase4CsvExport";

const STORAGE_DIR_NAME = "phase4-extraction";
const RESULTS_FILE_NAME = "phase4-extraction-results.json";
const CSV_FILE_NAME = "phase4-extraction-results-export.csv";

let resultSaveQueue: Promise<void> = Promise.resolve();

const getStoragePaths = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for Phase 4 extraction.");
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

export const savePhase4ExtractionResult = async (
  result: Phase4ExtractionResult,
) => {
  resultSaveQueue = resultSaveQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureStorageDir();
      const { resultsFile } = getStoragePaths();
      const results = await getPhase4ExtractionResults();
      await FileSystem.writeAsStringAsync(
        resultsFile,
        JSON.stringify([result, ...results], null, 2),
      );
    });

  return resultSaveQueue;
};

export const getPhase4ExtractionResults = async (): Promise<
  Phase4ExtractionResult[]
> => {
  await ensureStorageDir();
  const { resultsFile } = getStoragePaths();
  return readJsonArray<Phase4ExtractionResult>(resultsFile);
};

export const clearPhase4ExtractionResults = async () => {
  await ensureStorageDir();
  const { resultsFile } = getStoragePaths();
  await FileSystem.writeAsStringAsync(resultsFile, JSON.stringify([], null, 2));
};

export const exportPhase4ExtractionResultsCsv = async () => {
  await ensureStorageDir();
  const { csvFile } = getStoragePaths();
  const results = await getPhase4ExtractionResults();
  console.log(
    "Exporting Phase 4 extraction results to CSV with",
    results.length,
    "results",
  );
  const csv = buildPhase4ExtractionResultsCsv(results);
  console.log("Phase 4 CSV export built", {
    rowCount: results.length,
    characterCount: csv.length,
    csvFile,
  });
  await FileSystem.writeAsStringAsync(csvFile, csv);
  return csvFile;
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
    console.warn("Failed to read Phase 4 extraction storage", error);
    return [];
  }
};
