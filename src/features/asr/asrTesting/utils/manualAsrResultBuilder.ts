import type { TranscriptionResult } from "../../types/asr.types";
import type {
  ManualASRTestCase,
  ManualASRTestResult,
  TestSession,
} from "../types/manualAsrTesting.types";
import {
  calculateCharacterErrorRate,
  calculateWordErrorRate,
  normalizeAsrScoringText,
} from "./asrScoring";

export const createManualASRTestResult = (
  transcriptionResult: TranscriptionResult,
  testCase: ManualASRTestCase,
  session: TestSession,
  notes = "",
): ManualASRTestResult => {
  const recognizedText = transcriptionResult.transcript ?? "";
  const success = !transcriptionResult.error;
  const normalizedReferenceText = normalizeAsrScoringText(testCase.referenceText);
  const normalizedRecognizedText = normalizeAsrScoringText(recognizedText);
  const score =
    success && normalizedReferenceText
      ? calculateScores(normalizedReferenceText, normalizedRecognizedText)
      : { wer: null, cer: null };

  return {
    resultId: `manual-asr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    testCaseId: testCase.testCaseId,
    sessionId: session.sessionId,
    timestamp: new Date().toISOString(),
    modelId: transcriptionResult.modelId,
    modelName: transcriptionResult.modelName,
    engineType: transcriptionResult.engineType,
    language: transcriptionResult.language,
    runtimeMode: transcriptionResult.runtimeMode,
    referenceText: testCase.referenceText,
    recognizedText,
    normalizedReferenceText,
    normalizedRecognizedText,
    wer: score.wer,
    cer: score.cer,
    recordingDurationMs: transcriptionResult.recordingDurationMs ?? null,
    speechDurationMs: transcriptionResult.speechDurationMs ?? null,
    silenceDurationMs: transcriptionResult.silenceDurationMs ?? null,
    ttfsMs: transcriptionResult.timeToFirstTextMs ?? null,
    transcriptionTimeMs: transcriptionResult.transcriptionTimeMs ?? null,
    realTimeFactor: calculateRealTimeFactor(
      transcriptionResult.transcriptionTimeMs,
      transcriptionResult.recordingDurationMs,
    ),
    partialTranscriptsCount: transcriptionResult.partialTranscripts?.length ?? 0,
    segmentCount:
      transcriptionResult.segmentCount ??
      transcriptionResult.segmentTranscripts?.length ??
      0,
    batteryLevelStart: null,
    batteryLevelEnd: null,
    batteryDelta: null,
    thermalStateBefore: null,
    thermalStateAfter: null,
    memoryWarningCount: null,
    availableMemoryMbBefore: null,
    availableMemoryMbAfter: null,
    success,
    errorMessage: transcriptionResult.error ?? null,
    notes,
  };
};

const calculateScores = (
  normalizedReferenceText: string,
  normalizedRecognizedText: string,
) => {
  try {
    return {
      wer: calculateWordErrorRate(
        normalizedReferenceText,
        normalizedRecognizedText,
      ).rate,
      cer: calculateCharacterErrorRate(
        normalizedReferenceText,
        normalizedRecognizedText,
      ).rate,
    };
  } catch (error) {
    console.warn("Failed to calculate ASR error rates", error);
    return { wer: null, cer: null };
  }
};

const calculateRealTimeFactor = (
  transcriptionTimeMs?: number | null,
  recordingDurationMs?: number | null,
) => {
  if (
    transcriptionTimeMs === null ||
    transcriptionTimeMs === undefined ||
    recordingDurationMs === null ||
    recordingDurationMs === undefined ||
    recordingDurationMs === 0
  ) {
    return null;
  }

  return transcriptionTimeMs / recordingDurationMs;
};
