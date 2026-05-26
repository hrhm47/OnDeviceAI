import type { Phase4Language } from "./phase4.types";

export type Phase4HybridDueDateCode =
  | "now"
  | "plus_3_days"
  | "plus_7_days";

export type Phase4CompactCandidate = {
  id: string;
  label: string;
  confidence?: "high" | "medium" | "low" | "none";
  score?: number;
  evidence?: string[] | string | null;
};

export type Phase4HybridLLMInput = {
  promptVersion: "phase4_hybrid_rag_minimal_prompt_v1";
  language: Phase4Language;
  transcript: string;
  project: {
    projectId: string;
    projectName: string;
    activePhase?: string | null;
  };
  retrieval: {
    confidence?: "high" | "medium" | "low" | "missing";
    areaCandidates?: Phase4CompactCandidate[];
    companyCandidates?: Phase4CompactCandidate[];
    workTypeCandidates?: Phase4CompactCandidate[];
    actionCandidates?: Phase4CompactCandidate[];
    dateCandidates?: Phase4CompactCandidate[];
    tagCandidates?: Phase4CompactCandidate[];
    warnings?: string[];
  };
};

export type Phase4HybridLLMOutput = {
  description: string | null;
  multiIssueDetected: boolean;
  issueSummaries: string[];
  selectedCompanyId: string | null;
  selectedAreaId: string | null;
  requiredActionCode: string | null;
  dueDateCode: Phase4HybridDueDateCode | null;
  rawDueDateText?: string | null;
  tagCodes: string[];
  reviewNotes: string[];
};

export function isPhase4HybridLLMOutput(
  value: unknown,
): value is Phase4HybridLLMOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    "description" in item &&
    typeof item.multiIssueDetected === "boolean" &&
    Array.isArray(item.issueSummaries) &&
    "selectedCompanyId" in item &&
    "selectedAreaId" in item &&
    "requiredActionCode" in item &&
    "dueDateCode" in item &&
    Array.isArray(item.tagCodes) &&
    Array.isArray(item.reviewNotes)
  );
}
