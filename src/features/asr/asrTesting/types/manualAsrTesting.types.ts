import type {
  ASREngineType,
  ASRLanguage,
  ASRRuntimeMode,
} from "../../types/asr.types";

export type ManualASRTestMode = "manual_mobile_test";

export type NoiseCondition = "quiet" | "moderate_noise" | "hard_noise";

export type ManualASRTestCase = {
  testCaseId: string;
  pairId?: string;
  language: ASRLanguage;
  testSource?: string;
  category: string;
  difficulty: string;
  referenceText: string;
  expectedFields?: Record<string, string>;
  noiseConditions?: NoiseCondition[];
  notes?: string;
  requiresReferenceTextForScoring?: boolean;
};

export type TestSession = {
  sessionId: string;
  sessionName: string;
  testMode: ManualASRTestMode;
  noiseCondition: NoiseCondition;
  noiseProfile: {
    targetRangeDba: {
      min: number;
      max: number;
    };
    measuredLaeqDba: number | null;
    measuredMaxDba: number | null;
    measurementDurationSec: number | null;
    measurementDevice: string;
    soundMeterApp: string;
    measurementNotes: string;
  };
  testDevice: {
    deviceName: string;
    platform: string;
    role: string;
  };
  noiseSource: {
    type: string;
    sourceName: string;
    sourceUrlOrNote: string;
    playbackDevice: string;
    volumePercent: number | null;
    playbackStartTime: string;
    playbackEndTime: string;
    notes: string;
  };
  createdAt: string;
  notes: string;
};

export type ManualASRTestResult = {
  resultId: string;
  testCaseId: string;
  sessionId: string;
  timestamp: string;
  modelId: string;
  modelName: string;
  engineType: ASREngineType;
  language: ASRLanguage;
  runtimeMode: ASRRuntimeMode;
  referenceText: string;
  recognizedText: string;
  normalizedReferenceText: string;
  normalizedRecognizedText: string;
  wer: number | null;
  cer: number | null;
  recordingDurationMs: number | null;
  speechDurationMs: number | null;
  silenceDurationMs: number | null;
  ttfsMs: number | null;
  transcriptionTimeMs: number | null;
  realTimeFactor: number | null;
  partialTranscriptsCount: number | null;
  segmentCount: number | null;
  batteryLevelStart: number | null;
  batteryLevelEnd: number | null;
  batteryDelta: number | null;
  thermalStateBefore: string | null;
  thermalStateAfter: string | null;
  memoryWarningCount: number | null;
  availableMemoryMbBefore: number | null;
  availableMemoryMbAfter: number | null;
  success: boolean;
  errorMessage: string | null;
  notes: string;
};

export type Phase2ManualASRTestingConfig = {
  version: string;
  description: string;
  testSessions: TestSession[];
  testCases: ManualASRTestCase[];
  manualASRTestResultFields: (keyof ManualASRTestResult)[];
  csvExportFields: string[];
};
