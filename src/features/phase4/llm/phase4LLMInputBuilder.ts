import type {
  Phase4Language,
  Phase4CandidateResolution,
  Phase4LLMInput,
  Phase4ReferenceData,
} from "../types/phase4.types";

export function buildPhase4LLMInput(input: {
  transcript: string;
  language: Phase4Language;
  referenceData: Phase4ReferenceData;
  candidateResolution?: Phase4CandidateResolution;
}): Phase4LLMInput {
  return {
    promptVersion: "phase4_general_task_prompt_v1",
    language: input.language,
    transcript: input.transcript.trim(),
    formSchema: input.referenceData.formSchema,
    allowedCompanies: input.referenceData.companies,
    allowedTags: input.referenceData.tags,
    allowedRequiredActions: input.referenceData.requiredActions,
    allowedDueDates: input.referenceData.dueDates,
    extractionPolicy: input.referenceData.extractionPolicy,
    candidateResolution: input.candidateResolution,
  };
}
