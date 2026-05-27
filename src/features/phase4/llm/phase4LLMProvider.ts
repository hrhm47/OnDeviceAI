import type { Phase4HybridLLMInput } from "../types/phase4HybridLLM.types";

export type Phase4LLMProvider = {
  providerId: string;
  method: "local_llm_with_validation" | "mock_llm_with_validation";
  extractTaskForm(input: Phase4HybridLLMInput): Promise<{
    rawText: string;
    durationMs: number;
    generationDiagnostics?: {
      tokensPredicted?: number;
      stoppedLimit?: boolean;
      contextFull?: boolean;
      truncated?: boolean;
      stoppedEos?: boolean;
    };
  }>;
};
