import { resolvePhase4Candidates } from "../candidates/phase4CandidateResolver";
import { buildPhase4LLMInput } from "../llm/phase4LLMInputBuilder";
import { parsePhase4LLMOutput } from "../llm/phase4LLMOutputParser";
import type { Phase4LLMProvider } from "../llm/phase4LLMProvider";
import { phase4MockLLMProvider } from "../llm/phase4MockLLMProvider";
import { getPhase4ReferenceData } from "../referenceData/phase4ReferenceRepository";
import { retrievePhase4HybridContext, type Phase4HybridRetrievalResult } from "../retrieval/phase4HybridRetriever";
import { preparePhase4HybridRagRuntime } from "../storage/phase4HybridRagRuntime";
import type {
  GeneralTaskFormDraft,
  Phase4Candidate,
  Phase4CompanyCandidate,
  Phase4CandidateResolution,
  Phase4Language,
  Phase4ReferenceData,
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
  projectContext?: {
    activeUserId: string;
    activeUserName: string;
    projectId: string;
    projectName: string;
  } | null;
  retrievalRuntime?: {
    preparedAt: string;
    retrievalItemCount: number;
    ftsReady: boolean;
    embeddingModelReady: boolean;
    embeddingVectorCount: number;
    semanticReady: boolean;
    semanticStatusMessage: string;
    message: string;
  } | null;
};

export const extractGeneralTaskFormDraft = async (input: {
  phase3ResultId?: string | null;
  rawTranscript?: string | null;
  improvedTranscript?: string | null;
  transcript?: string | null;
  phase4UserId?: string | null;
  language: Phase4Language;
  provider?: Phase4LLMProvider;
}): Promise<Phase4ExtractionResult> => {
  const transcript = preparePhase4Transcript(input);
  const baseReferenceData = getPhase4ReferenceData();
  const { candidateResolution, hybridRetrieval, projectContext, retrievalRuntime, referenceData } =
    await resolveCandidateResolution({
      transcript,
      referenceData: baseReferenceData,
      userId: input.phase4UserId ?? undefined,
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
    projectContext,
    retrievalRuntime,
  };
};

const resolveCandidateResolution = async (input: {
  transcript: string;
  referenceData: Phase4ReferenceData;
  userId?: string;
}): Promise<{
  candidateResolution: Phase4CandidateResolution;
  hybridRetrieval: Phase4HybridRetrievalResult | null;
  projectContext: Phase4ExtractionResult["projectContext"];
  retrievalRuntime: Phase4ExtractionResult["retrievalRuntime"];
  referenceData: Phase4ReferenceData;
}> => {
  try {
    const runtime = await preparePhase4HybridRagRuntime({ userId: input.userId });
    const hybridRetrieval = await retrievePhase4HybridContext({
      transcript: input.transcript,
      context: runtime.context,
      db: runtime.db,
      items: runtime.retrievalItems,
      rebuildLexicalIndex: false,
      embeddingProvider: runtime.embeddingProvider,
    });
    const fallback = resolvePhase4Candidates({
      transcript: input.transcript,
      referenceData: input.referenceData,
    });
    return {
      candidateResolution: mergeHybridCandidates(
        hybridRetrieval,
        fallback,
      ),
      hybridRetrieval,
      projectContext: {
        activeUserId: runtime.context.activeUser.user_id,
        activeUserName: runtime.context.activeUser.display_name,
        projectId: runtime.context.project.project_id,
        projectName: runtime.context.project.project_name,
      },
      retrievalRuntime: {
        preparedAt: runtime.status.preparedAt,
        retrievalItemCount: runtime.status.retrievalItemCount,
        ftsReady: runtime.status.ftsReady,
        embeddingModelReady: runtime.status.embeddingModelReady,
        embeddingVectorCount: runtime.status.embeddingVectorCount,
        semanticReady: runtime.status.semanticReady,
        semanticStatusMessage: runtime.status.semanticStatusMessage,
        message: runtime.status.message,
      },
      referenceData: runtime.context.referenceData,
    };
  } catch (error) {
    console.warn("Phase 4 Hybrid RAG unavailable; using deterministic fallback resolver", error);
    return {
      candidateResolution: resolvePhase4Candidates({
        transcript: input.transcript,
        referenceData: input.referenceData,
      }),
      hybridRetrieval: null,
      projectContext: null,
      retrievalRuntime: null,
      referenceData: input.referenceData,
    };
  }
};

const mergeHybridCandidates = (
  hybrid: Phase4HybridRetrievalResult,
  fallback: Phase4CandidateResolution,
): Phase4CandidateResolution => ({
  companyCandidates: confidentCompanyCandidates(hybrid.companyCandidates),
  areaCandidates: confidentCandidates(hybrid.areaCandidates),
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

const confidentCompanyCandidates = (candidates: Phase4CompanyCandidate[]) =>
  candidates.filter((candidate) => candidate.confidence !== "low");

const confidentCandidates = <T,>(candidates: Phase4Candidate<T>[]) =>
  candidates.filter((candidate) => candidate.confidence !== "low");
