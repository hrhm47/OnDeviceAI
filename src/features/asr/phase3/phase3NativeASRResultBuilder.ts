import type {
  ManualASRTestCase,
  TestSession,
} from "../asrTesting/types/manualAsrTesting.types";
import {
  calculateCharacterErrorRate,
  calculateWordErrorRate,
  normalizeAsrScoringText,
} from "../asrTesting/utils/asrScoring";
import type {
  NativeASRPhase3Config,
  NativeIOSASRCapabilities,
  NativeIOSASRMetricsEvent,
  Phase3NativeASRResult,
} from "./nativeASRPhase3.types";
import { preparePhase3Transcript } from "./transcriptPreparation";

export type CreatePhase3NativeASRResultInput = {
  config: NativeASRPhase3Config;
  capabilities?: NativeIOSASRCapabilities | null;
  metrics?: NativeIOSASRMetricsEvent | null;
  testCase?: ManualASRTestCase | null;
  session?: TestSession | null;
  rawTranscript: string;
  partialTranscripts: string[];
  recordingDurationMs?: number | null;
  ttfsMs?: number | null;
  finalLatencyMs?: number | null;
  transcriptionTimeMs?: number | null;
  success: boolean;
  errorMessage?: string | null;
  notes?: string | null;
};

export const createPhase3NativeASRResult = ({
  config,
  capabilities,
  metrics,
  testCase,
  session,
  rawTranscript,
  partialTranscripts,
  recordingDurationMs,
  ttfsMs,
  finalLatencyMs,
  transcriptionTimeMs,
  success,
  errorMessage,
  notes,
}: CreatePhase3NativeASRResultInput): Phase3NativeASRResult => {
  const transcript = preparePhase3Transcript(rawTranscript, config);
  const normalizedReferenceText = testCase?.referenceText
    ? normalizeAsrScoringText(testCase.referenceText)
    : null;
  const rawScores = normalizedReferenceText
    ? score(normalizedReferenceText, transcript.normalizedTranscript)
    : { wer: null, cer: null };
  const improvedScores = normalizedReferenceText
    ? score(normalizedReferenceText, normalizeAsrScoringText(transcript.improvedTranscript))
    : { wer: null, cer: null };
  const resolvedTranscriptionTimeMs =
    transcriptionTimeMs ?? finalLatencyMs ?? null;
  const realTimeFactor =
    recordingDurationMs && resolvedTranscriptionTimeMs !== null
      ? resolvedTranscriptionTimeMs / recordingDurationMs
      : null;

  return {
    resultId: `phase3-native-ios-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    testCaseId: testCase?.testCaseId ?? null,
    sessionId: session?.sessionId ?? null,
    modelId: "native_ios",
    modelName: "Native iOS ASR",
    engineType: "native",
    language: config.language,
    locale: config.locale,
    configId: config.configId,
    rawTranscript: transcript.rawTranscript,
    finalTranscript: transcript.finalTranscript,
    normalizedTranscript: transcript.normalizedTranscript,
    improvedTranscript: transcript.improvedTranscript,
    referenceText: testCase?.referenceText ?? null,
    normalizedReferenceText,
    rawWER: rawScores.wer,
    rawCER: rawScores.cer,
    improvedWER: improvedScores.wer,
    improvedCER: improvedScores.cer,
    shouldReportPartialResults: true,
    partialTranscriptsCount: partialTranscripts.length,
    partialTranscripts,
    taskHint: "dictation",
    contextualStringsEnabled: config.contextualStringsEnabled,
    contextualStringsCount: config.contextualStringsEnabled
      ? config.contextualStrings.length
      : 0,
    addsPunctuation: config.addsPunctuation,
    addsPunctuationApplied: metrics?.addsPunctuationApplied ?? null,
    onDevicePolicy: config.onDevicePolicy,
    supportsOnDeviceRecognition:
      metrics?.supportsOnDeviceRecognition ??
      capabilities?.supportsOnDeviceRecognition ??
      false,
    requestedRequiresOnDeviceRecognition:
      metrics?.requestedRequiresOnDeviceRecognition ?? false,
    recognitionPrivacyMode:
      metrics?.recognitionPrivacyMode ??
      (config.onDevicePolicy === "allowNetwork"
        ? "network_allowed"
        : "network_allowed_fallback"),
    recognizerAvailable:
      metrics?.recognizerAvailable ?? capabilities?.recognizerAvailable ?? false,
    recordingDurationMs: recordingDurationMs ?? null,
    ttfsMs: ttfsMs ?? null,
    finalLatencyMs: finalLatencyMs ?? null,
    transcriptionTimeMs: resolvedTranscriptionTimeMs,
    realTimeFactor,
    audioSessionCategory:
      metrics?.audioSessionCategory ??
      capabilities?.currentAudioSessionCategory ??
      null,
    audioSessionMode:
      metrics?.audioSessionMode ?? capabilities?.currentAudioSessionMode ?? null,
    sampleRate: metrics?.sampleRate ?? capabilities?.sampleRate ?? null,
    success,
    errorMessage: errorMessage ?? null,
    notes: notes ?? null,
  };
};

const score = (normalizedReferenceText: string, normalizedRecognizedText: string) => ({
  wer: calculateWordErrorRate(normalizedReferenceText, normalizedRecognizedText).rate,
  cer: calculateCharacterErrorRate(normalizedReferenceText, normalizedRecognizedText).rate,
});
