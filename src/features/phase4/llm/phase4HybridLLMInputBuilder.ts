import type { ProjectContextPackage } from "../context/activeProjectContextLoader";
import type { Phase4HybridRetrievalResult } from "../retrieval/phase4HybridRetriever";
import type { Phase4CompactCandidate, Phase4HybridLLMInput } from "../types/phase4HybridLLM.types";
import type {
  Phase4Language,
  Phase4Candidate,
  Phase4CandidateResolution,
  Phase4CompanyCandidate,
} from "../types/phase4.types";

export function buildPhase4HybridLLMInput(input: {
  transcript: string;
  language: Phase4Language;
  context: ProjectContextPackage;
  hybridRetrieval: Phase4HybridRetrievalResult;
  candidateResolution: Phase4CandidateResolution;
}): Phase4HybridLLMInput {
  return {
    promptVersion: "phase4_hybrid_rag_minimal_prompt_v1",
    language: input.language,
    transcript: input.transcript.trim(),
    project: {
      projectId: input.context.project.project_id,
      projectName: input.context.project.project_name,
      activePhase: null,
    },
    retrieval: {
      confidence: retrievalConfidence(input.hybridRetrieval),
      areaCandidates: input.candidateResolution.areaCandidates.map(toCompactCandidate),
      companyCandidates: input.candidateResolution.companyCandidates.map(toCompanyCandidate),
      workTypeCandidates: input.candidateResolution.workTypeCandidates?.map(toCompactCandidate),
      actionCandidates: input.candidateResolution.requiredActionCandidates.map(toCompactCandidate),
      dateCandidates: input.candidateResolution.dueDateCandidates.map(toCompactCandidate),
      tagCandidates: input.candidateResolution.tagCandidates.map(toCompactCandidate),
      warnings: input.hybridRetrieval.warnings,
    },
  };
}

const toCompactCandidate = <T,>(candidate: Phase4Candidate<T>): Phase4CompactCandidate => ({
  id: candidate.id ?? String(candidate.value),
  label: candidate.label ?? String(candidate.value),
  confidence: candidate.confidence,
  score: candidate.score,
  evidence: candidate.evidence,
});

const toCompanyCandidate = (
  candidate: Phase4CompanyCandidate,
): Phase4CompactCandidate => ({
  id: candidate.value.companyId,
  label: candidate.value.displayName,
  confidence: candidate.confidence,
  score: candidate.score,
  evidence: candidate.evidence,
});

const retrievalConfidence = (retrieval: Phase4HybridRetrievalResult) => {
  const top = [
    ...retrieval.companyCandidates,
    ...retrieval.areaCandidates,
    ...retrieval.actionCandidates,
    ...retrieval.dateCandidates,
    ...retrieval.tagCandidates,
  ][0];
  return top?.confidence ?? "missing";
};
