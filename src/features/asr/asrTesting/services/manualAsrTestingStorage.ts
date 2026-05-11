import * as FileSystem from "expo-file-system/legacy";

import phase2ManualAsrConfig from "../data/phase2_manual_asr_testing_config_en_fi.json";
import type {
  ManualASRTestCase,
  ManualASRTestResult,
  Phase2ManualASRTestingConfig,
  TestSession,
} from "../types/manualAsrTesting.types";

const STORAGE_DIR_NAME = "phase2-manual-asr-testing";
const SESSIONS_FILE_NAME = "test-sessions.json";
const RESULTS_FILE_NAME = "manual-asr-results.json";
const CSV_FILE_NAME = "manual-asr-results-export.csv";

let sessionSaveQueue: Promise<void> = Promise.resolve();
let resultSaveQueue: Promise<void> = Promise.resolve();

const config = phase2ManualAsrConfig as Phase2ManualASRTestingConfig;

const getStoragePaths = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for Phase 2 ASR testing.");
  }

  const storageDir = `${documentDirectory}${STORAGE_DIR_NAME}/`;
  return {
    storageDir,
    sessionsFile: `${storageDir}${SESSIONS_FILE_NAME}`,
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

export const getManualTestCases = (): ManualASRTestCase[] =>
  [...config.testCases];

export const getCsvExportFields = () => [...config.csvExportFields];

export const getTestSessions = async (): Promise<TestSession[]> => {
  await ensureStorageDir();
  const { sessionsFile } = getStoragePaths();
  const storedSessions = await readJsonArray<TestSession>(sessionsFile);
  if (!storedSessions.length) {
    return [...config.testSessions];
  }

  const sessionsById = new Map<string, TestSession>();
  config.testSessions.forEach((session) => {
    sessionsById.set(session.sessionId, session);
  });
  storedSessions.forEach((session) => {
    sessionsById.set(session.sessionId, session);
  });
  return Array.from(sessionsById.values());
};

export const saveTestSession = async (session: TestSession) => {
  sessionSaveQueue = sessionSaveQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureStorageDir();
      const { sessionsFile } = getStoragePaths();
      const sessions = await getTestSessions();
      const nextSessions = [
        session,
        ...sessions.filter((item) => item.sessionId !== session.sessionId),
      ];
      await FileSystem.writeAsStringAsync(
        sessionsFile,
        JSON.stringify(nextSessions, null, 2),
      );
    });

  return sessionSaveQueue;
};

export const getManualASRTestResults = async (): Promise<
  ManualASRTestResult[]
> => {
  await ensureStorageDir();
  const { resultsFile } = getStoragePaths();
  return readJsonArray<ManualASRTestResult>(resultsFile);
};

export const saveManualASRTestResult = async (
  result: ManualASRTestResult,
) => {
  resultSaveQueue = resultSaveQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureStorageDir();
      const { resultsFile } = getStoragePaths();
      const results = await getManualASRTestResults();
      await FileSystem.writeAsStringAsync(
        resultsFile,
        JSON.stringify([result, ...results], null, 2),
      );
    });

  return resultSaveQueue;
};

export const exportManualASRResultsCsv = async () => {
  await ensureStorageDir();
  const { csvFile } = getStoragePaths();
  const [results, sessions] = await Promise.all([
    getManualASRTestResults(),
    getTestSessions(),
  ]);
  const testCases = getManualTestCases();
  const csv = buildManualASRResultsCsv(results, sessions, testCases);
  await FileSystem.writeAsStringAsync(csvFile, csv);
  return csvFile;
};

export const buildManualASRResultsCsv = (
  results: ManualASRTestResult[],
  sessions: TestSession[],
  testCases: ManualASRTestCase[],
) => {
  const sessionsById = new Map(
    sessions.map((session) => [session.sessionId, session]),
  );
  const testCasesById = new Map(
    testCases.map((testCase) => [testCase.testCaseId, testCase]),
  );
  const fields = getCsvExportFields();
  const rows = results.map((result) => {
    const session = sessionsById.get(result.sessionId);
    const testCase = testCasesById.get(result.testCaseId);
    const flat = flattenCsvRow(result, session, testCase);
    return fields.map((field) => escapeCsvValue(flat[field])).join(",");
  });

  return [fields.join(","), ...rows].join("\n");
};

const flattenCsvRow = (
  result: ManualASRTestResult,
  session?: TestSession,
  testCase?: ManualASRTestCase,
): Record<string, string | number | boolean | null | undefined> => ({
  resultId: result.resultId,
  timestamp: result.timestamp,
  testCaseId: result.testCaseId,
  sessionId: result.sessionId,
  noiseCondition: session?.noiseCondition,
  measuredLaeqDba: session?.noiseProfile.measuredLaeqDba,
  measuredMaxDba: session?.noiseProfile.measuredMaxDba,
  noiseSourceType: session?.noiseSource.type,
  noiseSourceName: session?.noiseSource.sourceName,
  volumePercent: session?.noiseSource.volumePercent,
  modelId: result.modelId,
  modelName: result.modelName,
  engineType: result.engineType,
  language: result.language,
  runtimeMode: result.runtimeMode,
  category: testCase?.category,
  difficulty: testCase?.difficulty,
  referenceText: result.referenceText,
  recognizedText: result.recognizedText,
  normalizedReferenceText: result.normalizedReferenceText,
  normalizedRecognizedText: result.normalizedRecognizedText,
  wer: result.wer,
  cer: result.cer,
  recordingDurationMs: result.recordingDurationMs,
  speechDurationMs: result.speechDurationMs,
  silenceDurationMs: result.silenceDurationMs,
  ttfsMs: result.ttfsMs,
  transcriptionTimeMs: result.transcriptionTimeMs,
  realTimeFactor: result.realTimeFactor,
  partialTranscriptsCount: result.partialTranscriptsCount,
  segmentCount: result.segmentCount,
  batteryLevelStart: result.batteryLevelStart,
  batteryLevelEnd: result.batteryLevelEnd,
  batteryDelta: result.batteryDelta,
  thermalStateBefore: result.thermalStateBefore,
  thermalStateAfter: result.thermalStateAfter,
  memoryWarningCount: result.memoryWarningCount,
  availableMemoryMbBefore: result.availableMemoryMbBefore,
  availableMemoryMbAfter: result.availableMemoryMbAfter,
  success: result.success,
  errorMessage: result.errorMessage,
  notes: result.notes,
});

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
    console.warn("Failed to read Phase 2 ASR testing storage", error);
    return [];
  }
};

const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
