import {
  normalizeAsrScoringText,
} from "../asrTesting/utils/asrScoring";
import type {
  NativeASRPhase3Config,
  Phase3TranscriptOutput,
} from "./nativeASRPhase3.types";

export const preparePhase3Transcript = (
  rawTranscript: string,
  config: NativeASRPhase3Config,
): Phase3TranscriptOutput => {
  const normalizedTranscript = config.transcriptPreparation.normalizeForScoring
    ? normalizeAsrScoringText(rawTranscript)
    : rawTranscript.trim();

  return {
    rawTranscript,
    finalTranscript: rawTranscript,
    normalizedTranscript,
    improvedTranscript: rawTranscript,
    correctionRulesApplied: [],
  };
};
