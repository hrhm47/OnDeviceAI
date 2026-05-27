import type {
  Phase4CompactCandidate,
  Phase4HybridLLMInput,
} from "../types/phase4HybridLLM.types";

export const PHASE4_RETRIEVED_CANDIDATE_LIMIT = 3;

export function buildPhase4HybridExtractionPrompt(
  input: Phase4HybridLLMInput,
): string {
  const payload = {
    language: input.language,
    transcript: input.transcript,
    activeProject: {
      projectId: input.project.projectId,
      projectName: input.project.projectName,
      activePhase: input.project.activePhase ?? null,
    },
    retrievedCandidates: {
      areas: compactCandidates(input.retrieval.areaCandidates),
      companies: compactCandidates(input.retrieval.companyCandidates),
      actions: compactCandidates(input.retrieval.actionCandidates),
      dates: compactCandidates(input.retrieval.dateCandidates),
      tags: compactCandidates(input.retrieval.tagCandidates),
    },
    retrievalConfidence: input.retrieval.confidence ?? "missing",
    retrievalWarnings: input.retrieval.warnings ?? [],
  };

  return `
Extract one compact construction task JSON object.

Use only IDs from retrievedCandidates. If no listed candidate fits, return null
or [] for that field. Do not output the full form. The app validates the final
draft after this response.

Input:
${JSON.stringify(payload)}

Selection rules:
- selectedCompanyId: one of retrievedCandidates.companies[].id or null.
- selectedAreaId: one of retrievedCandidates.areas[].id or null.
- requiredActionCode: one of retrievedCandidates.actions[].id or null.
- dueDateCode: one of retrievedCandidates.dates[].id or null.
- tagCodes: only retrievedCandidates.tags[].id values.
- multiIssueDetected: true only when the transcript has separate issues.
`.trim();
}

function compactCandidates(
  candidates: Phase4CompactCandidate[] | undefined,
) {
  const uniqueCandidates = new Map<string, Phase4CompactCandidate>();
  for (const candidate of candidates ?? []) {
    if (!uniqueCandidates.has(candidate.id)) {
      uniqueCandidates.set(candidate.id, candidate);
    }
  }

  return Array.from(uniqueCandidates.values()).slice(0, PHASE4_RETRIEVED_CANDIDATE_LIMIT).map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    confidence: candidate.confidence ?? null,
    score: candidate.score ?? null,
    evidence: candidate.evidence ?? null,
  }));
}
