export type ASRLanguage = "en" | "fi";

export type ASREngineType = "native" | "whisper" | "qwen" | "vosk";

export type AudioInput = {
  uri?: string;
  samples?: Float32Array;
  sampleRate?: number;
  language: ASRLanguage;
  recordingDurationMs?: number;
};

export type TranscriptionResult = {
  id: string;
  timestamp: string;

  modelId: string;
  modelName: string;
  engineType: ASREngineType;

  language: ASRLanguage;

  transcript: string;
  partialTranscripts?: string[];

  recordingDurationMs: number;
  transcriptionTimeMs: number;
  timeToFirstTextMs?: number | null;

  audioUri?: string;
  sampleRate?: number;

  deviceInfo?: {
    platform: "ios" | "android";
    osVersion?: string;
    deviceModel?: string;
  };

  error?: string | null;
};

export interface ASREngine {
  id: string;
  name: string;
  engineType: ASREngineType;
  mode: "native" | "local-model";
  languageSupport: ASRLanguage[];
  supportsStreaming: boolean;
  isAvailable(): Promise<boolean>;
  initialize(): Promise<void>;
  transcribe(input: AudioInput): Promise<TranscriptionResult>;
  dispose(): Promise<void>;
}

export type ASREngineAvailabilityStatus =
  | "ready"
  | "not-ready"
  | "model-files-missing"
  | "unsupported-language"
  | "initialization-failed";

export type ASREngineMetadata = Pick<
  ASREngine,
  "id" | "name" | "engineType" | "mode" | "languageSupport" | "supportsStreaming"
> & {
  status: ASREngineAvailabilityStatus;
  detail: string;
  readinessMessage?: string;
};
