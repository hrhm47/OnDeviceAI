import { normalizeText } from "../rag/area/exactAreaMatcher";
import type { Phase4Confidence, Phase4FieldStatus } from "../types/phase4.types";

export type RetrievedCompanyCandidate = {
  companyId: string;
  displayName: string;
  confidence?: "high" | "medium" | "low";
  evidence?: string[] | string | null;
};

export type ResolvedCompanyField = {
  value: string | null;
  companyId: string | null;
  status: Phase4FieldStatus;
  confidence: Phase4Confidence;
  reason: string;
  warnings: string[];
  reviewNotes: string[];
};

export function resolveCompanyField(input: {
  llmCompanyId: string | null;
  llmCompanyName?: string | null;
  companyCandidates: RetrievedCompanyCandidate[];
}): ResolvedCompanyField {
  const warnings: string[] = [];
  const reviewNotes: string[] = [];
  const canonicalLlmId = input.llmCompanyId;
  const byId = canonicalLlmId
    ? input.companyCandidates.find(
        (candidate) => candidate.companyId === canonicalLlmId,
      )
    : null;

  if (byId) {
    return resolved(byId, byId.confidence ?? "medium", "Company selected from retrieved candidate ID.", warnings, reviewNotes);
  }

  const byName = input.llmCompanyName
    ? input.companyCandidates.find(
        (candidate) =>
          normalizeText(candidate.displayName) ===
          normalizeText(input.llmCompanyName ?? ""),
      )
    : null;
  if (byName) {
    warnings.push("LLM company name matched a candidate but companyId was missing or wrong.");
    return resolved(byName, byName.confidence ?? "medium", "Company selected by matching display name to retrieved candidate.", warnings, reviewNotes);
  }

  const topHighCandidate = input.companyCandidates.find(
    (candidate) => candidate.confidence === "high",
  );
  const usefulCandidates = input.companyCandidates.filter(
    (candidate) => candidate.confidence === "high" || candidate.confidence === "medium",
  );
  if (topHighCandidate && usefulCandidates.length === 1) {
    reviewNotes.push("Company selected from high-confidence retrieval candidate.");
    return resolved(topHighCandidate, "high", "LLM did not provide a valid company, so high-confidence retrieval candidate was used.", warnings, reviewNotes);
  }

  if (usefulCandidates.length > 0) {
    reviewNotes.push("Company must be selected from retrieved candidates.");
    return {
      value: null,
      companyId: null,
      status: "selection_required",
      confidence: topHighCandidate ? "high" : "medium",
      reason: "Multiple possible company candidates were found; select the correct company.",
      warnings,
      reviewNotes,
    };
  }

  if (input.llmCompanyId || input.llmCompanyName) {
    reviewNotes.push(
      `Unsupported LLM company suggestion: ${input.llmCompanyId ?? input.llmCompanyName}`,
    );
  }

  return {
    value: null,
    companyId: null,
    status: "manual_required",
    confidence: "none",
    reason: "No safe company candidate found.",
    warnings,
    reviewNotes,
  };
}

const resolved = (
  candidate: RetrievedCompanyCandidate,
  confidence: Phase4Confidence,
  reason: string,
  warnings: string[],
  reviewNotes: string[],
): ResolvedCompanyField => ({
  value: candidate.displayName,
  companyId: candidate.companyId,
  status: "suggested",
  confidence,
  reason,
  warnings,
  reviewNotes,
});
