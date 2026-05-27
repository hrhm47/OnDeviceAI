import type { Phase4Language } from "./phase4.types";

export type Phase4HybridDueDateCode =
  | "now"
  | "plus_3_days"
  | "plus_7_days";

export const PHASE4_LLM_DESCRIPTION_MAX_LENGTH = 180;

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
  description: string;
  multiIssueDetected: boolean;
  selectedCompanyId: string | null;
  selectedAreaId: string | null;
  requiredActionCode: string | null;
  dueDateCode: Phase4HybridDueDateCode | null;
  tagCodes: string[];
};

export function isPhase4HybridLLMOutput(
  value: unknown,
): value is Phase4HybridLLMOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  const keys = Object.keys(item);
  const expectedKeys = [
    "description",
    "multiIssueDetected",
    "selectedCompanyId",
    "selectedAreaId",
    "requiredActionCode",
    "dueDateCode",
    "tagCodes",
  ];

  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(item, key)) &&
    typeof item.description === "string" &&
    item.description.trim().length > 0 &&
    item.description.length <= PHASE4_LLM_DESCRIPTION_MAX_LENGTH &&
    typeof item.multiIssueDetected === "boolean" &&
    (typeof item.selectedCompanyId === "string" || item.selectedCompanyId === null) &&
    (typeof item.selectedAreaId === "string" || item.selectedAreaId === null) &&
    (typeof item.requiredActionCode === "string" || item.requiredActionCode === null) &&
    isDueDateCode(item.dueDateCode) &&
    Array.isArray(item.tagCodes) &&
    item.tagCodes.every((code) => typeof code === "string")
  );
}

const isDueDateCode = (value: unknown): value is Phase4HybridDueDateCode | null =>
  value === null ||
  value === "now" ||
  value === "plus_3_days" ||
  value === "plus_7_days";
