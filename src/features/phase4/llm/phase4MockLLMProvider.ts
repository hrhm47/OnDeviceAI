import type { Phase4HybridLLMInput } from "../types/phase4HybridLLM.types";
import { PHASE4_LLM_DESCRIPTION_MAX_LENGTH } from "../types/phase4HybridLLM.types";
import type { Phase4LLMProvider } from "./phase4LLMProvider";

export const phase4MockLLMProvider: Phase4LLMProvider = {
  providerId: "phase4_mock_llm_provider_v2_compact_hybrid",
  method: "mock_llm_with_validation",
  async extractTaskForm(input) {
    const startedAt = Date.now();
    return {
      rawText: JSON.stringify(buildMockOutput(input), null, 2),
      durationMs: Date.now() - startedAt,
    };
  },
};

const buildMockOutput = (input: Phase4HybridLLMInput) => {
  const normalized = normalize(input.transcript);
  const dateCandidate = input.retrieval.dateCandidates?.find((candidate) =>
    dateEvidenceMatches(normalized, candidate.id),
  );
  const actionCandidate = input.retrieval.actionCandidates?.find((candidate) =>
    actionEvidenceMatches(normalized, candidate.id),
  );
  const tagCandidates =
    input.retrieval.tagCandidates
      ?.filter((candidate) => tagEvidenceMatches(normalized, candidate.id))
      .map((candidate) => candidate.id) ?? [];

  return {
    description: buildDescription(input.transcript),
    multiIssueDetected: detectMultiIssue(normalized),
    selectedCompanyId: input.retrieval.companyCandidates?.[0]?.id ?? null,
    selectedAreaId: input.retrieval.areaCandidates?.[0]?.id ?? null,
    requiredActionCode: actionCandidate?.id ?? null,
    dueDateCode: dateCandidate?.id ?? null,
    tagCodes: tagCandidates.length
      ? tagCandidates
      : input.retrieval.tagCandidates?.[0]?.id
        ? [input.retrieval.tagCandidates[0].id]
        : [],
  };
};

const buildDescription = (transcript: string) =>
  transcript
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PHASE4_LLM_DESCRIPTION_MAX_LENGTH);

const detectMultiIssue = (normalized: string) => {
  const groups = [
    ["paint", "scratch", "wall finish"],
    ["silicone", "sealant", "waterproofing", "moisture"],
    ["door", "lock", "does not close"],
    ["cable", "wire", "electrical"],
    ["pipe", "sink", "leak", "radiator"],
  ];
  return (
    groups.filter((group) => group.some((item) => normalized.includes(item))).length >=
      2 && /\b(and|also|ja|seka)\b/.test(normalized)
  );
};

const actionEvidenceMatches = (normalized: string, code: string) => {
  if (code === "repair") {
    return matchesAny(normalized, [
      "fix",
      "fixed",
      "repair",
      "needs to be fixed",
      "should be fixed",
      "leak",
      "does not close",
      "korja",
    ]);
  }
  if (code === "repaint") {
    return matchesAny(normalized, ["paint", "repaint", "scratch", "wall finish"]);
  }
  if (code === "seal") {
    return matchesAny(normalized, ["seal", "silicone", "caulk", "kittaus"]);
  }
  return false;
};

const dateEvidenceMatches = (normalized: string, code: string) => {
  if (code === "now") {
    return matchesAny(normalized, ["today", "now", "urgent", "tanaan"]);
  }
  if (code === "plus_3_days") {
    return matchesAny(normalized, ["three days", "3 days", "kolme"]);
  }
  if (code === "plus_7_days") {
    return matchesAny(normalized, ["week", "7 days", "viikko"]);
  }
  return false;
};

const tagEvidenceMatches = (normalized: string, code: string) => {
  if (code === "quality") {
    return matchesAny(normalized, ["quality", "defect", "inspection", "laatu"]);
  }
  if (code === "safety") {
    return matchesAny(normalized, ["safety", "danger", "hazard", "turvallisuus"]);
  }
  if (code === "palokatko") {
    return normalized.includes("palokatko") || normalized.includes("fire stop");
  }
  return false;
};

const matchesAny = (normalized: string, needles: string[]) =>
  needles.some((needle) => normalized.includes(normalize(needle)));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
