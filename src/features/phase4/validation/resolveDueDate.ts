import { normalizeText } from "../rag/area/exactAreaMatcher";
import type { Phase4AllowedDueDate, Phase4Confidence, Phase4FieldStatus } from "../types/phase4.types";
import type { Phase4HybridDueDateCode } from "../types/phase4HybridLLM.types";

export type ResolvedDueDateField = {
  code: Phase4HybridDueDateCode | null;
  value: Phase4AllowedDueDate | string | null;
  rawText: string | null;
  status: Phase4FieldStatus;
  confidence: Phase4Confidence;
  reason: string;
  reviewNotes: string[];
};

export function resolveDueDate(input: {
  transcript: string;
  llmDueDateCode?: Phase4HybridDueDateCode | null;
  reviewNotes?: string[];
}): ResolvedDueDateField {
  if (input.llmDueDateCode) {
    return dueDateFromCode(input.llmDueDateCode, "Selected by LLM from retrieved date codes.");
  }

  const normalized = normalizeText(input.transcript);
  if (
    normalized.includes("today") ||
    normalized.includes("now") ||
    normalized.includes("urgent") ||
    normalized.includes("heti") ||
    normalized.includes("tanaan")
  ) {
    return dueDateFromCode("now", "Matched today/now/urgent phrase.");
  }

  if (
    normalized.includes("in three days") ||
    normalized.includes("within three days") ||
    normalized.includes("3 days") ||
    normalized.includes("kolmen paivan")
  ) {
    return dueDateFromCode("plus_3_days", "Matched 3 day phrase.");
  }

  if (
    normalized.includes("next week") ||
    normalized.includes("within a week") ||
    normalized.includes("7 days") ||
    normalized.includes("ensi viikolla")
  ) {
    return dueDateFromCode("plus_7_days", "Matched next week / 7 day phrase.");
  }

  const rawText = detectFlexibleDateText(input.transcript, input.reviewNotes ?? []);
  return {
    code: null,
    value: rawText,
    rawText,
    status: rawText ? "manual_required" : "manual_required",
    confidence: rawText ? "low" : "none",
    reason: rawText
      ? "Unsupported due date was preserved for user review."
      : "No due date phrase found.",
    reviewNotes: rawText ? [`Unsupported due date spoken: ${rawText}`] : [],
  };
}

function dueDateFromCode(
  code: Phase4HybridDueDateCode,
  reason: string,
): ResolvedDueDateField {
  const valueMap = {
    now: "Now",
    plus_3_days: "+3 days",
    plus_7_days: "+7 days",
  } as const;

  return {
    code,
    value: valueMap[code],
    rawText: null,
    status: "suggested",
    confidence: "high",
    reason,
    reviewNotes: [],
  };
}

const detectFlexibleDateText = (transcript: string, reviewNotes: string[]) => {
  const known = transcript.match(/\b(tomorrow|huomenna|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next monday|next tuesday|next wednesday|next thursday|next friday)\b/i)?.[0];
  if (known) {
    return known;
  }
  const note = reviewNotes.find((item) =>
    normalizeText(item).includes("unsupported due date"),
  );
  return note?.replace(/^Unsupported due date spoken:\s*/i, "").trim() || null;
};
