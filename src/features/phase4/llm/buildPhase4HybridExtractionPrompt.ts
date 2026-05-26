import type {
  Phase4CompactCandidate,
  Phase4HybridLLMInput,
} from "../types/phase4HybridLLM.types";

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
      areas: compactCandidates(input.retrieval.areaCandidates, 3),
      companies: compactCandidates(input.retrieval.companyCandidates, 3),
      workTypes: compactCandidates(input.retrieval.workTypeCandidates, 3),
      actions: compactCandidates(input.retrieval.actionCandidates, 3),
      dates: compactCandidates(input.retrieval.dateCandidates, 3),
      tags: compactCandidates(input.retrieval.tagCandidates, 3),
    },
    retrievalConfidence: input.retrieval.confidence ?? "missing",
    retrievalWarnings: input.retrieval.warnings ?? [],
  };

  return `
You are a construction report extraction helper.

Your job is to create a SMALL JSON extraction result from the transcript and retrieved candidates.

Rules:
- Use only IDs from retrievedCandidates.
- Do not invent company IDs.
- Do not invent area IDs.
- If no candidate is suitable, return null for that field.
- Do not output the full form.
- Do not output list, marker, photos, impacts, or notifications.
- The app will build and validate the final form after your response.
- Description must be a real short construction description, not a placeholder.
- If the transcript contains multiple separate issues, set multiIssueDetected to true.
- If a due date phrase does not match the listed date IDs, set dueDateCode to null and preserve the phrase in reviewNotes.
- Return JSON only. No markdown. No explanation outside JSON.

Input:
${JSON.stringify(payload, null, 2)}

Return JSON only with this exact shape:

{
  "description": string | null,
  "multiIssueDetected": boolean,
  "issueSummaries": string[],
  "selectedCompanyId": string | null,
  "selectedAreaId": string | null,
  "requiredActionCode": string | null,
  "dueDateCode": "now" | "plus_3_days" | "plus_7_days" | null,
  "tagCodes": string[],
  "reviewNotes": string[]
}

Field rules:
- selectedCompanyId must be one of retrievedCandidates.companies[].id or null.
- selectedAreaId must be one of retrievedCandidates.areas[].id or null.
- requiredActionCode must be one of retrievedCandidates.actions[].id or null.
- dueDateCode must be one of retrievedCandidates.dates[].id or null.
- tagCodes must contain only retrievedCandidates.tags[].id values.
`.trim();
}

function compactCandidates(
  candidates: Phase4CompactCandidate[] | undefined,
  limit: number,
) {
  return (candidates ?? []).slice(0, limit).map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    confidence: candidate.confidence ?? null,
    score: candidate.score ?? null,
    evidence: candidate.evidence ?? null,
  }));
}
