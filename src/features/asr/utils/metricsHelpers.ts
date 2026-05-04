import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  ASREngine,
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

export const getDeviceInfo = (): TranscriptionResult["deviceInfo"] => {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return undefined;
  }

  return {
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    deviceModel: Constants.deviceName ?? undefined,
  };
};

export const createBaseTranscriptionResult = (
  engine: Pick<ASREngine, "id" | "name" | "engineType">,
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
  recordingDurationMs: input.recordingDurationMs ?? 0,
  transcriptionTimeMs: overrides?.transcriptionTimeMs ?? 0,
  timeToFirstTextMs: overrides?.timeToFirstTextMs ?? null,
  audioUri: input.uri,
  sampleRate: input.sampleRate,
  deviceInfo: getDeviceInfo(),
  error: overrides?.error ?? null,
});

export const createErrorTranscriptionResult = (
  engine: Pick<ASREngine, "id" | "name" | "engineType">,
  input: AudioInput,
  error: unknown,
  transcriptionTimeMs: number,
): TranscriptionResult =>
  createBaseTranscriptionResult(engine, input, {
    transcriptionTimeMs,
    error: error instanceof Error ? error.message : String(error),
  });
