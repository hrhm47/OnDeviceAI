export type ASRLanguage = "en" | "fi";

export type ASREngineType = "native" | "whisper" | "qwen" | "parakeet";

export type ASRStreamingMode =
  | "true-streaming"
  | "vad-segmented"
  | "offline-batch";

export type AudioInput = {
  uri?: string;
  samples?: Float32Array;
  sampleRate?: number;
  language: ASRLanguage;
  recordingDurationMs?: number;
  speechSegmentCount?: number;
  averageSegmentProcessingTimeMs?: number | null;
  vadMetrics?: VADMetrics;
};

export type StreamingASROptions = {
  language: ASRLanguage;
  sampleRate?: number;
  onPartialResult?: (partialText: string) => void;
  onFinalResult?: (finalText: string) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
};

export type VADMetrics = {
  vadSpeechStartCount: number;
  vadSpeechEndCount: number;
  totalSpeechDurationMs: number;
  totalSilenceDurationMs: number;
  segmentCount: number;
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

  streamingMode: ASRStreamingMode;

  audioUri?: string;
  sampleRate?: number;

  speechSegmentCount?: number;
  averageSegmentProcessingTimeMs?: number | null;
  vadMetrics?: VADMetrics;

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
  streamingMode: ASRStreamingMode;
  isAvailable(): Promise<boolean>;
  initialize(): Promise<void>;
  transcribe(input: AudioInput): Promise<TranscriptionResult>;
  startStreaming?(options: StreamingASROptions): Promise<void>;
  acceptAudioChunk?(chunk: Float32Array, sampleRate: number): Promise<void>;
  stopStreaming?(): Promise<TranscriptionResult>;
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
  | "id"
  | "name"
  | "engineType"
  | "mode"
  | "languageSupport"
  | "supportsStreaming"
  | "streamingMode"
> & {
  status: ASREngineAvailabilityStatus;
  detail: string;
  readinessMessage?: string;
};
