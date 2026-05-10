import {
  ASREngine,
  ASRRuntimeMode,
  AudioInput,
  TranscriptionResult,
} from "../types/asr.types";

export const nowMs = () => {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }

  return Date.now();
};

export const createAsrResultId = () =>
  `asr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createBaseTranscriptionResult = (
  engine: Pick<ASREngine, "id" | "name" | "engineType" | "runtimeMode">,
  input: AudioInput,
  overrides?: Partial<TranscriptionResult>,
): TranscriptionResult => ({
  id: overrides?.id ?? createAsrResultId(),
  timestamp: overrides?.timestamp ?? new Date().toISOString(),
  modelId: engine.id,
  modelName: engine.name,
  engineType: engine.engineType,
  language: input.language,
  transcript: overrides?.transcript ?? "",
  partialTranscripts: overrides?.partialTranscripts,
  segmentTranscripts: overrides?.segmentTranscripts,
  recordingDurationMs: input.recordingDurationMs ?? 0,
  speechDurationMs: overrides?.speechDurationMs,
  silenceDurationMs: overrides?.silenceDurationMs,
  transcriptionTimeMs: overrides?.transcriptionTimeMs ?? 0,
  timeToFirstTextMs: overrides?.timeToFirstTextMs ?? null,
  runtimeMode: overrides?.runtimeMode ?? engine.runtimeMode,
  audioUri: input.uri,
  sampleRate: input.sampleRate,
  segmentCount: overrides?.segmentCount,
  error: overrides?.error ?? null,
});

export const createErrorTranscriptionResult = (
  engine: Pick<ASREngine, "id" | "name" | "engineType" | "runtimeMode">,
  input: AudioInput,
  error: unknown,
  transcriptionTimeMs: number,
  runtimeMode?: ASRRuntimeMode,
): TranscriptionResult =>
  createBaseTranscriptionResult(engine, input, {
    transcriptionTimeMs,
    runtimeMode,
    error: error instanceof Error ? error.message : String(error),
  });
