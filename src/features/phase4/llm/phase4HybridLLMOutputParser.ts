import {
  isPhase4HybridLLMOutput,
  type Phase4HybridLLMOutput,
} from "../types/phase4HybridLLM.types";

export type Phase4HybridParseResult = {
  success: boolean;
  output: Phase4HybridLLMOutput | null;
  normalizedText: string;
  errorMessage: string | null;
};

export const parsePhase4HybridLLMOutput = (
  rawText: string,
): Phase4HybridParseResult => {
  const normalizedText = stripCodeFence(rawText.trim());

  try {
    const parsed: unknown = JSON.parse(normalizedText);
    if (!isPhase4HybridLLMOutput(parsed)) {
      return fail(normalizedText, "LLM output was not the compact Hybrid RAG shape.");
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
