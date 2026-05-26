import { buildPhase4HybridLLMInput } from "../llm/phase4HybridLLMInputBuilder";
import { parsePhase4HybridLLMOutput } from "../llm/phase4HybridLLMOutputParser";
import type { Phase4LLMProvider } from "../llm/phase4LLMProvider";
import { phase4MockLLMProvider } from "../llm/phase4MockLLMProvider";
import { retrievePhase4HybridContext, type Phase4HybridRetrievalResult } from "../retrieval/phase4HybridRetriever";
import { preparePhase4HybridRagRuntime } from "../storage/phase4HybridRagRuntime";
import type {
  GeneralTaskFormDraft,
  Phase4Candidate,
  Phase4CompanyCandidate,
  Phase4CandidateResolution,
  Phase4Language,
  Phase4ReviewSuggestions,
} from "../types/phase4.types";
import type { Phase4ValidationWarning } from "../validation/phase4Warnings";
import { buildHybridGeneralTaskDraft, type Phase4HybridDraftBuildResult } from "./buildHybridGeneralTaskDraft";
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
  promptVersion: "phase4_hybrid_rag_minimal_prompt_v1";
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
  const {
    candidateResolution,
    hybridRetrieval,
    projectContext,
    retrievalRuntime,
    runtimeContext,
  } = await resolveHybridCandidateResolution({
      transcript,
      userId: input.phase4UserId ?? undefined,
    });
  const llmInput = buildPhase4HybridLLMInput({
    transcript,
    language: input.language,
    context: runtimeContext,
    hybridRetrieval,
  });
  console.log("Phase 4 LLM input summary:", {
    providerLanguage: input.language,
    transcriptLength: transcript.length,
    allowedCompaniesCount: llmInput.retrieval.companyCandidates?.length ?? 0,
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
    ? parsePhase4HybridLLMOutput(rawLlmOutput)
    : { success: false, output: null, normalizedText: "", errorMessage: providerError };
  console.log("Phase 4 LLM parse summary:", {
    success: parseResult.success,
    errorMessage: parseResult.errorMessage,
    normalizedTextLength: parseResult.normalizedText.length,
  });
  const validationStartedAt = Date.now();
  const validation: Phase4HybridDraftBuildResult = buildHybridGeneralTaskDraft({
    llmOutput: parseResult.output,
    transcript,
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

const resolveHybridCandidateResolution = async (input: {
  transcript: string;
  userId?: string;
}): Promise<{
  candidateResolution: Phase4CandidateResolution;
  hybridRetrieval: Phase4HybridRetrievalResult;
  projectContext: Phase4ExtractionResult["projectContext"];
  retrievalRuntime: Phase4ExtractionResult["retrievalRuntime"];
  runtimeContext: Awaited<ReturnType<typeof preparePhase4HybridRagRuntime>>["context"];
}> => {
  const runtime = await preparePhase4HybridRagRuntime({ userId: input.userId });
  const hybridRetrieval = await retrievePhase4HybridContext({
    transcript: input.transcript,
    context: runtime.context,
    db: runtime.db,
    items: runtime.retrievalItems,
    rebuildLexicalIndex: false,
    embeddingProvider: runtime.embeddingProvider,
  });
  return {
    candidateResolution: hybridOnlyCandidates(hybridRetrieval),
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
    runtimeContext: runtime.context,
  };
};

const hybridOnlyCandidates = (
  hybrid: Phase4HybridRetrievalResult,
): Phase4CandidateResolution => ({
  companyCandidates: confidentCompanyCandidates(hybrid.companyCandidates),
  areaCandidates: confidentCandidates(hybrid.areaCandidates),
  workTypeCandidates: confidentCandidates(hybrid.workTypeCandidates),
  requiredActionCandidates: confidentCandidates(hybrid.actionCandidates),
  dueDateCandidates: confidentCandidates(hybrid.dateCandidates),
  tagCandidates: confidentCandidates(hybrid.tagCandidates),
});

const confidentCompanyCandidates = (candidates: Phase4CompanyCandidate[]) =>
  candidates.filter((candidate) => candidate.confidence !== "low");

const confidentCandidates = <T,>(candidates: Phase4Candidate<T>[]) =>
  candidates.filter((candidate) => candidate.confidence !== "low");
