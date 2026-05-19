import { buildPhase4LLMInput } from "../llm/phase4LLMInputBuilder";
import { parsePhase4LLMOutput } from "../llm/phase4LLMOutputParser";
import { phase4MockLLMProvider } from "../llm/phase4MockLLMProvider";
import type { Phase4LLMProvider } from "../llm/phase4LLMProvider";
import { getPhase4ReferenceData } from "../referenceData/phase4ReferenceRepository";
import type { GeneralTaskFormDraft, Phase4Language } from "../types/phase4.types";
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
  llmProviderId: string;
  method: Phase4LLMProvider["method"];
  promptVersion: "phase4_general_task_prompt_v1";
  extractionTimeMs: number;
  rawLlmOutput: string;
  parseSuccess: boolean;
  validationPassed: boolean;
  warnings: Phase4ValidationWarning[];
  errorMessage?: string | null;
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
  const llmInput = buildPhase4LLMInput({
    transcript,
    language: input.language,
    referenceData,
  });
  const provider = input.provider ?? phase4MockLLMProvider;
  let rawLlmOutput = "";
  let extractionTimeMs = 0;
  let providerError: string | null = null;

  try {
    const response = await provider.extractTaskForm(llmInput);
    rawLlmOutput = response.rawText;
    extractionTimeMs = response.durationMs;
  } catch (error) {
    providerError = error instanceof Error ? error.message : String(error);
  }

  const parseResult = rawLlmOutput
    ? parsePhase4LLMOutput(rawLlmOutput)
    : { success: false, output: null, normalizedText: "", errorMessage: providerError };
  const validation: Phase4ValidationResult = validateAndBuildTaskFormDraft({
    parsedOutput: parseResult.output,
    transcript,
    referenceData,
  });

  return {
    resultId: `phase4-extraction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    phase3ResultId: input.phase3ResultId ?? null,
    language: input.language,
    transcript,
    draft: validation.draft,
    llmProviderId: provider.providerId,
    method: provider.method,
    promptVersion: llmInput.promptVersion,
    extractionTimeMs,
    rawLlmOutput,
    parseSuccess: parseResult.success,
    validationPassed: validation.validationPassed && parseResult.success,
    warnings: validation.warnings,
    errorMessage: providerError ?? parseResult.errorMessage,
  };
};
