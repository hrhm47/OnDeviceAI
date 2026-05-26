import { resolvePhase4Candidates } from "../candidates/phase4CandidateResolver";
import { loadActiveProjectContext } from "../context/activeProjectContextLoader";
import { buildPhase4LLMInput } from "../llm/phase4LLMInputBuilder";
import { parsePhase4LLMOutput } from "../llm/phase4LLMOutputParser";
import type { Phase4LLMProvider } from "../llm/phase4LLMProvider";
import { phase4MockLLMProvider } from "../llm/phase4MockLLMProvider";
import { getPhase4ReferenceData } from "../referenceData/phase4ReferenceRepository";
import { retrievePhase4HybridContext, type Phase4HybridRetrievalResult } from "../retrieval/phase4HybridRetriever";
import {
  importPhase4SeedBundle,
  initializePhase4HybridRagDatabase,
} from "../storage/phase4HybridRagDb";
import type {
  GeneralTaskFormDraft,
  Phase4CandidateResolution,
  Phase4Language,
  Phase4ReviewSuggestions,
} from "../types/phase4.types";
import {
  validateAndBuildTaskFormDraft,
  type Phase4ValidationResult,
} from "../validation/phase4DraftValidator";
import type { Phase4ValidationWarning } from "../validation/phase4Warnings";
import { preparePhase4Transcript } from "./phase4TranscriptPreparation";

export type Phase4ExtractionResult = {
  resultId: string;
  timestamp: string;
  phase3ResultId?: string | null;
  language: Phase4Language;
  transcript: string;
  draft: GeneralTaskFormDraft;
  reviewSuggestions: Phase4ReviewSuggestions;
  llmProviderId: string;
  method: Phase4LLMProvider["method"];
  promptVersion: "phase4_general_task_prompt_v1";
  extractionTimeMs: number;
  rawLlmOutput: string;
  parseSuccess: boolean;
  validationPassed: boolean;
  warnings: Phase4ValidationWarning[];
  errorMessage?: string | null;
  hybridRetrieval?: Phase4HybridRetrievalResult | null;
};

export const extractGeneralTaskFormDraft = async (input: {
  phase3ResultId?: string | null;
  rawTranscript?: string | null;
  improvedTranscript?: string | null;
  transcript?: string | null;
  language: Phase4Language;
  provider?: Phase4LLMProvider;
}): Promise<Phase4ExtractionResult> => {
  const transcript = preparePhase4Transcript(input);
  const referenceData = getPhase4ReferenceData();
  const deterministicCandidateResolution = resolvePhase4Candidates({
    transcript,
    referenceData,
  });
  const { candidateResolution, hybridRetrieval } =
    await resolveHybridCandidateResolution({
      transcript,
      deterministicCandidateResolution,
    });
  const llmInput = buildPhase4LLMInput({
    transcript,
    language: input.language,
    referenceData,
    candidateResolution,
  });
  console.log("Phase 4 LLM input summary:", {
    providerLanguage: input.language,
    transcriptLength: transcript.length,
    allowedCompaniesCount: llmInput.allowedCompanies.length,
    companyCandidatesCount: candidateResolution.companyCandidates.length,
    areaCandidatesCount: candidateResolution.areaCandidates.length,
    actionCandidatesCount: candidateResolution.requiredActionCandidates.length,
    dueDateCandidatesCount: candidateResolution.dueDateCandidates.length,
    tagCandidatesCount: candidateResolution.tagCandidates.length,
  });
  const provider = input.provider ?? phase4MockLLMProvider;
  console.log(`Using LLM provider: ${provider.providerId} with method ${provider.method}`);
  let rawLlmOutput = "";
  let extractionTimeMs = 0;
  let providerError: string | null = null;

  try {
    const providerStartedAt = Date.now();
    const response = await provider.extractTaskForm(llmInput);
    console.log("Phase 4 LLM response summary:", {
      elapsedMs: Date.now() - providerStartedAt,
      providerDurationMs: response.durationMs,
      rawTextLength: response.rawText.length,
    });
    rawLlmOutput = response.rawText;
    extractionTimeMs = response.durationMs;
  } catch (error) {
    providerError = error instanceof Error ? error.message : String(error);
  }

  const parseResult = rawLlmOutput
    ? parsePhase4LLMOutput(rawLlmOutput)
    : { success: false, output: null, normalizedText: "", errorMessage: providerError };
  console.log("Phase 4 LLM parse summary:", {
    success: parseResult.success,
    errorMessage: parseResult.errorMessage,
    normalizedTextLength: parseResult.normalizedText.length,
  });
  const validationStartedAt = Date.now();
  const validation: Phase4ValidationResult = validateAndBuildTaskFormDraft({
    parsedOutput: parseResult.output,
    transcript,
    referenceData,
    candidateResolution,
  });

  console.log("Phase 4 validation summary:", {
    validationMs: Date.now() - validationStartedAt,
    validationPassed: validation.validationPassed,
    warnings: validation.warnings,
    company: validation.draft.company.value,
    area: validation.draft.area.value,
    requiredAction: validation.draft.requiredAction.value,
    dueDate: validation.draft.requiredActionDueDate.value,
    tags: validation.draft.tags.value,
    reviewSuggestions: validation.reviewSuggestions,
  });

  return {
    resultId: `phase4-extraction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    phase3ResultId: input.phase3ResultId ?? null,
    language: input.language,
    transcript,
    draft: validation.draft,
    reviewSuggestions: validation.reviewSuggestions,
    llmProviderId: provider.providerId,
    method: provider.method,
    promptVersion: llmInput.promptVersion,
    extractionTimeMs,
    rawLlmOutput,
    parseSuccess: parseResult.success,
    validationPassed: validation.validationPassed && parseResult.success,
    warnings: validation.warnings,
    errorMessage: providerError ?? parseResult.errorMessage,
    hybridRetrieval,
  };
};

const resolveHybridCandidateResolution = async (input: {
  transcript: string;
  deterministicCandidateResolution: Phase4CandidateResolution;
}): Promise<{
  candidateResolution: Phase4CandidateResolution;
  hybridRetrieval: Phase4HybridRetrievalResult | null;
}> => {
  const contextResult = loadActiveProjectContext();
  if (!contextResult.ok) {
    return {
      candidateResolution: input.deterministicCandidateResolution,
      hybridRetrieval: null,
    };
  }

  try {
    const db = await initializePhase4HybridRagDatabase();
    await importPhase4SeedBundle(db);
    const hybridRetrieval = await retrievePhase4HybridContext({
      transcript: input.transcript,
      context: contextResult.context,
      db,
    });
    return {
      candidateResolution: mergeHybridCandidates(
        hybridRetrieval,
        input.deterministicCandidateResolution,
      ),
      hybridRetrieval,
    };
  } catch (error) {
    console.warn("Phase 4 Hybrid RAG fallback to deterministic resolver", error);
    return {
      candidateResolution: input.deterministicCandidateResolution,
      hybridRetrieval: null,
    };
  }
};

const mergeHybridCandidates = (
  hybrid: Phase4HybridRetrievalResult,
  fallback: Phase4CandidateResolution,
): Phase4CandidateResolution => ({
  companyCandidates: hybrid.companyCandidates.length
    ? hybrid.companyCandidates
    : fallback.companyCandidates,
  areaCandidates: hybrid.areaCandidates.length
    ? hybrid.areaCandidates
    : fallback.areaCandidates,
  requiredActionCandidates: hybrid.actionCandidates.length
    ? hybrid.actionCandidates
    : fallback.requiredActionCandidates,
  dueDateCandidates: hybrid.dateCandidates.length
    ? hybrid.dateCandidates
    : fallback.dueDateCandidates,
  tagCandidates: hybrid.tagCandidates.length
    ? hybrid.tagCandidates
    : fallback.tagCandidates,
});
