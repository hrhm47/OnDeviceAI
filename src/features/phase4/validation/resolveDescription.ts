import { normalizeText } from "../rag/area/exactAreaMatcher";
import type { Phase4Confidence, Phase4FieldStatus } from "../types/phase4.types";

export type ResolvedDescriptionField = {
  value: string;
  status: Phase4FieldStatus;
  confidence: Phase4Confidence;
  reason: string;
};

const PLACEHOLDER_DESCRIPTIONS = [
  "short description from transcript",
  "description from transcript",
  "transcript phrase",
  "example description",
  "todo",
];

export function resolveDescription(input: {
  llmDescription: string | null;
  transcript: string;
}): ResolvedDescriptionField {
  const llmValue = input.llmDescription?.trim();
  if (llmValue && !isPlaceholderDescription(llmValue)) {
    return {
      value: llmValue,
      status: "extracted",
      confidence: "medium",
      reason: "Description accepted from compact LLM output.",
    };
  }

  return {
    value: buildDescriptionFromTranscript(input.transcript),
    status: "extracted",
    confidence: "medium",
    reason: "Description fallback built from transcript.",
  };
}

function isPlaceholderDescription(value: string): boolean {
  const normalized = normalizeText(value);
  return PLACEHOLDER_DESCRIPTIONS.some(
    (placeholder) => normalizeText(placeholder) === normalized,
  );
}

function buildDescriptionFromTranscript(transcript: string): string {
  return transcript.replace(/\s+/g, " ").trim();
}
