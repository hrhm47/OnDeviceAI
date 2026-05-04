import { TranscriptionResult } from "../types/asr.types";

export const logAsrResult = (result: TranscriptionResult) => {
  console.log("[ASR]", {
    id: result.id,
    modelId: result.modelId,
    modelName: result.modelName,
    engineType: result.engineType,
    language: result.language,
    recordingDurationMs: result.recordingDurationMs,
    transcriptionTimeMs: result.transcriptionTimeMs,
    timeToFirstTextMs: result.timeToFirstTextMs,
    transcriptLength: result.transcript.length,
    error: result.error,
  });
};
