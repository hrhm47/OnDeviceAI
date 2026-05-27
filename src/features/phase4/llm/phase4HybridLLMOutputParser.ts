import {
  isPhase4HybridLLMOutput,
  type Phase4HybridLLMInput,
  type Phase4HybridLLMOutput,
} from "../types/phase4HybridLLM.types";
import { PHASE4_RETRIEVED_CANDIDATE_LIMIT } from "./buildPhase4HybridExtractionPrompt";

export type Phase4HybridParseResult = {
  success: boolean;
  output: Phase4HybridLLMOutput | null;
  normalizedText: string;
  errorMessage: string | null;
};

export const parsePhase4HybridLLMOutput = (
  rawText: string,
  input?: Phase4HybridLLMInput,
): Phase4HybridParseResult => {
  const normalizedText = stripCodeFence(rawText.trim());

  try {
    const parsed: unknown = JSON.parse(normalizedText);
    if (!isPhase4HybridLLMOutput(parsed)) {
      return fail(normalizedText, "LLM output was not the compact Hybrid RAG shape.");
    }
    const contractError = input
      ? validateCandidateContract(parsed, input)
      : null;
    if (contractError) {
      return fail(normalizedText, contractError);
    }
    return {
      success: true,
      output: parsed,
      normalizedText,
      errorMessage: null,
    };
  } catch (error) {
    return fail(
      normalizedText,
      error instanceof Error ? error.message : "Failed to parse LLM JSON.",
    );
  }
};

const validateCandidateContract = (
  output: Phase4HybridLLMOutput,
  input: Phase4HybridLLMInput,
) => {
  const companyIds = visibleCandidateIds(input.retrieval.companyCandidates);
  const areaIds = visibleCandidateIds(input.retrieval.areaCandidates);
  const actionIds = visibleCandidateIds(input.retrieval.actionCandidates);
  const dateIds = visibleCandidateIds(input.retrieval.dateCandidates);
  const tagIds = visibleCandidateIds(input.retrieval.tagCandidates);

  return (
    validateNullableId("selectedCompanyId", output.selectedCompanyId, companyIds) ??
    validateNullableId("selectedAreaId", output.selectedAreaId, areaIds) ??
    validateNullableId("requiredActionCode", output.requiredActionCode, actionIds) ??
    validateNullableId("dueDateCode", output.dueDateCode, dateIds) ??
    validateTagCodes(output.tagCodes, tagIds)
  );
};

const validateNullableId = (
  fieldId: string,
  value: string | null,
  allowedIds: string[],
) => {
  if (value === null || allowedIds.includes(value)) {
    return null;
  }
  return `${fieldId} was not one of the visible retrieved candidate IDs.`;
};

const validateTagCodes = (tagCodes: string[], allowedIds: string[]) => {
  const seen = new Set<string>();
  for (const code of tagCodes) {
    if (!allowedIds.includes(code)) {
      return "tagCodes contained an ID that was not a visible retrieved tag candidate.";
    }
    if (seen.has(code)) {
      return "tagCodes contained duplicate IDs.";
    }
    seen.add(code);
  }
  return null;
};

const visibleCandidateIds = (
  candidates: { id?: string }[] | undefined,
) =>
  compactUnique(candidates?.map((candidate) => candidate.id)).slice(
    0,
    PHASE4_RETRIEVED_CANDIDATE_LIMIT,
  );

const compactUnique = (values: (string | undefined)[] | undefined) =>
  Array.from(
    new Set((values ?? []).filter((value): value is string => Boolean(value))),
  );

const stripCodeFence = (text: string) => {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? text;
};

const fail = (
  normalizedText: string,
  errorMessage: string,
): Phase4HybridParseResult => ({
  success: false,
  output: null,
  normalizedText,
  errorMessage,
});
