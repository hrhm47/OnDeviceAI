import { TranscriptionResult } from "../types/asr.types";

export const logAsrResult = (result: TranscriptionResult) => {
  console.log("[ASR]", {
    id: result.id,
    modelId: result.modelId,
    modelName: result.modelName,
    engineType: result.engineType,
    language: result.language,
    streamingMode: result.streamingMode,
    recordingDurationMs: result.recordingDurationMs,
    transcriptionTimeMs: result.transcriptionTimeMs,
    timeToFirstTextMs: result.timeToFirstTextMs,
    speechSegmentCount: result.speechSegmentCount,
    averageSegmentProcessingTimeMs: result.averageSegmentProcessingTimeMs,
    vadMetrics: result.vadMetrics,
    transcriptLength: result.transcript.length,
    error: result.error,
  });
};
