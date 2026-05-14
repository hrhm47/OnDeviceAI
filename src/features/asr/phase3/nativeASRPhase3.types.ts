export type NativeASRLocale = "en-US" | "fi-FI";

export type NativeASRLanguage = "en" | "fi";

export type NativeASROnDevicePolicy =
  | "prefer"
  | "require"
  | "allowNetwork";

export type NativeRecognitionPrivacyMode =
  | "on_device_required"
  | "on_device_preferred"
  | "network_allowed"
  | "network_allowed_fallback"
  | "unsupported_required_failed";

export type NativeASRPhase3Config = {
  configId: string;
  locale: NativeASRLocale;
  language: NativeASRLanguage;
  shouldReportPartialResults: true;
  taskHint: "dictation";
  onDevicePolicy: NativeASROnDevicePolicy;
  contextualStringsEnabled: boolean;
  contextualStrings: string[];
  addsPunctuation: boolean;
  transcriptPreparation: {
    enabled: boolean;
    normalizeForScoring: boolean;
    correctionRulesEnabled: boolean;
  };
};

export const DEFAULT_NATIVE_ASR_PHASE3_CONFIG: NativeASRPhase3Config = {
  configId: "native_ios_phase3_default_v1",
  locale: "en-US",
  language: "en",
  shouldReportPartialResults: true,
  taskHint: "dictation",
  onDevicePolicy: "prefer",
  contextualStringsEnabled: false,
  contextualStrings: [],
  addsPunctuation: false,
  transcriptPreparation: {
    enabled: true,
    normalizeForScoring: true,
    correctionRulesEnabled: false,
  },
};

export type NativeIOSASRCapabilities = {
  platform: "ios";
  requestedLocale: NativeASRLocale;
  recognizerAvailable: boolean;
  supportsOnDeviceRecognition: boolean;
  osVersion?: string | null;
  deviceModel?: string | null;
  currentAudioSessionCategory?: string | null;
  currentAudioSessionMode?: string | null;
  sampleRate?: number | null;
  supportsPartialResultsByConfig: boolean;
};

export type NativeIOSASRPermissionStatus = {
  microphonePermission: "granted" | "denied" | "undetermined" | "unknown";
  speechRecognitionPermission:
    | "granted"
    | "denied"
    | "restricted"
    | "notDetermined"
    | "unknown";
  canStartRecognition: boolean;
};

export type NativeIOSASRPartialEvent = {
  text: string;
  timestampMs: number;
  isFinal: false;
};

export type NativeIOSASRFinalEvent = {
  text: string;
  timestampMs: number;
  isFinal: true;
};

export type NativeIOSASRErrorEvent = {
  errorCode?: string | null;
  errorMessage: string;
};

export type NativeIOSASRStateEvent = {
  state:
    | "idle"
    | "requesting_permissions"
    | "ready"
    | "recording"
    | "recognizing"
    | "stopping"
    | "completed"
    | "cancelled"
    | "error";
};

export type NativeIOSASRMetricsEvent = {
  configId?: string;
  locale?: NativeASRLocale;
  language?: NativeASRLanguage;
  onDevicePolicy?: NativeASROnDevicePolicy;
  supportsOnDeviceRecognition?: boolean;
  requestedRequiresOnDeviceRecognition?: boolean;
  recognitionPrivacyMode?: NativeRecognitionPrivacyMode;
  contextualStringsEnabled?: boolean;
  contextualStringsCount?: number;
  addsPunctuation?: boolean;
  addsPunctuationApplied?: boolean | null;
  recognizerAvailable?: boolean;
  audioSessionCategory?: string | null;
  audioSessionMode?: string | null;
  sampleRate?: number | null;
};

export type Phase3TranscriptOutput = {
  rawTranscript: string;
  finalTranscript: string;
  normalizedTranscript: string;
  improvedTranscript: string;
  correctionRulesApplied: string[];
};

export type Phase3NativeASRResult = {
  resultId: string;
  timestamp: string;
  testCaseId?: string | null;
  sessionId?: string | null;
  modelId: "native_ios";
  modelName: "Native iOS ASR";
  engineType: "native";
  language: NativeASRLanguage;
  locale: NativeASRLocale;
  configId: string;
  rawTranscript: string;
  finalTranscript: string;
  normalizedTranscript: string;
  improvedTranscript: string;
  referenceText?: string | null;
  normalizedReferenceText?: string | null;
  rawWER?: number | null;
  rawCER?: number | null;
  improvedWER?: number | null;
  improvedCER?: number | null;
  shouldReportPartialResults: true;
  partialTranscriptsCount: number;
  partialTranscripts?: string[];
  taskHint: "dictation";
  contextualStringsEnabled: boolean;
  contextualStringsCount: number;
  addsPunctuation: boolean;
  addsPunctuationApplied?: boolean | null;
  onDevicePolicy: NativeASROnDevicePolicy;
  supportsOnDeviceRecognition: boolean;
  requestedRequiresOnDeviceRecognition: boolean;
  recognitionPrivacyMode: NativeRecognitionPrivacyMode;
  recognizerAvailable: boolean;
  recordingDurationMs?: number | null;
  ttfsMs?: number | null;
  finalLatencyMs?: number | null;
  transcriptionTimeMs?: number | null;
  realTimeFactor?: number | null;
  audioSessionCategory?: string | null;
  audioSessionMode?: string | null;
  sampleRate?: number | null;
  success: boolean;
  errorMessage?: string | null;
  notes?: string | null;
};

export const nativeASRLocaleForLanguage = (
  language: NativeASRLanguage,
): NativeASRLocale => (language === "fi" ? "fi-FI" : "en-US");
