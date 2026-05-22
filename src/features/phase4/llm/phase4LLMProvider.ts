import type { Phase4LLMInput } from "../types/phase4.types";

export type Phase4LLMProvider = {
  providerId: string;
  method: "local_llm_with_validation" | "mock_llm_with_validation";
  extractTaskForm(input: Phase4LLMInput): Promise<{
    rawText: string;
    durationMs: number;
  }>;
};
