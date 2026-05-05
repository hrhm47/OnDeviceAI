import { TranscriptionResult } from "../types/asr.types";

export const logAsrResult = (result: TranscriptionResult) => {
  console.log("[ASR]", {
    id: result.id,
    modelId: result.modelId,
    modelName: result.modelName,
    engineType: result.engineType,
    language: result.language,
    runtimeMode: result.runtimeMode,
    recordingDurationMs: result.recordingDurationMs,
    speechDurationMs: result.speechDurationMs,
    silenceDurationMs: result.silenceDurationMs,
    transcriptionTimeMs: result.transcriptionTimeMs,
    timeToFirstTextMs: result.timeToFirstTextMs,
    segmentCount: result.segmentCount,
    segmentTranscripts: result.segmentTranscripts?.length ?? 0,
    transcriptLength: result.transcript.length,
    error: result.error,
  });
};
