export type ASRLanguage = "en" | "fi";

export type ASREngineType = "native" | "whisper" | "qwen" | "parakeet";

export type ASRRuntimeMode =
  | "true-streaming"
  | "vad-segmented-offline"
  | "offline-full-recording"
  | "unsupported";

export type AudioInput = {
  uri?: string;
  samples?: Float32Array;
  sampleRate?: number;
  language: ASRLanguage;
  recordingDurationMs?: number;
  segmentId?: string;
};

export type SegmentTranscript = {
  segmentId: string;
  transcript: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  processingTimeMs: number;
  error?: string | null;
};

export type VADMetrics = {
  speechStartCount: number;
  speechEndCount: number;
  speechDurationMs: number;
  silenceDurationMs: number;
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
  segmentTranscripts?: SegmentTranscript[];

  recordingDurationMs: number;
  speechDurationMs?: number;
  silenceDurationMs?: number;

  transcriptionTimeMs: number;
  timeToFirstTextMs?: number | null;

  runtimeMode: ASRRuntimeMode;

  segmentCount?: number;
  sampleRate?: number;
  audioUri?: string;

  error?: string | null;
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

export interface ASREngine {
  id: string;
  name: string;
  engineType: ASREngineType;
  mode: "native" | "local-model";
  languageSupport: ASRLanguage[];
  supportsStreaming: boolean;
  runtimeMode: ASRRuntimeMode;
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
  | "runtimeMode"
> & {
  status: ASREngineAvailabilityStatus;
  detail: string;
  readinessMessage?: string;
};
