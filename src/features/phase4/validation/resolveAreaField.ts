import type { Phase4Confidence, Phase4FieldStatus } from "../types/phase4.types";

export type RetrievedAreaCandidate = {
  areaId: string;
  displayName: string;
  confidence?: "high" | "medium" | "low";
  matchType?: "exact" | "lexical" | "semantic" | "metadata";
  evidence?: string[] | string | null;
};

export type ResolvedAreaField = {
  value: string | null;
  areaId: string | null;
  status: Phase4FieldStatus;
  confidence: Phase4Confidence;
  reason: string;
  warnings: string[];
  reviewNotes: string[];
};

export function resolveAreaField(input: {
  llmAreaId: string | null;
  areaCandidates: RetrievedAreaCandidate[];
  spokenAreaText?: string | null;
}): ResolvedAreaField {
  const warnings: string[] = [];
  const reviewNotes: string[] = [];
  const byId = input.llmAreaId
    ? input.areaCandidates.find((candidate) => candidate.areaId === input.llmAreaId)
    : null;

  if (byId) {
    return resolved(byId, byId.confidence ?? "medium", "Area selected from retrieved candidate ID.", warnings, reviewNotes);
  }

  const exactCandidate = input.areaCandidates.find(
    (candidate) =>
      candidate.matchType === "exact" && candidate.confidence === "high",
  );
  if (exactCandidate) {
    reviewNotes.push("Area selected from exact transcript match.");
    return resolved(exactCandidate, "high", "Area selected from exact apartment and room match.", warnings, reviewNotes);
  }

  if (input.spokenAreaText) {
    warnings.push(
      `Spoken area "${input.spokenAreaText}" was not found in active project area data.`,
    );
  }

  return {
    value: null,
    areaId: null,
    status: "manual_required",
    confidence: "none",
    reason: "No safe area candidate found.",
    warnings,
    reviewNotes,
  };
}

const resolved = (
  candidate: RetrievedAreaCandidate,
  confidence: Phase4Confidence,
  reason: string,
  warnings: string[],
  reviewNotes: string[],
): ResolvedAreaField => ({
  value: candidate.displayName,
  areaId: candidate.areaId,
  status: "suggested",
  confidence,
  reason,
  warnings,
  reviewNotes,
});
