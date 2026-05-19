import { PHASE4_SELECTED_LLM_MODEL } from "./phase4ModelConfig";
import type { Phase4LLMProvider } from "./phase4LLMProvider";

export const phase4LocalLLMProvider: Phase4LLMProvider = {
  providerId: "phase4_local_llm_provider_qwen2_5_placeholder_v1",
  method: "local_llm_with_validation",
  async extractTaskForm() {
    throw new Error(
      `Local Phase 4 LLM provider is not connected yet. Expected ${PHASE4_SELECTED_LLM_MODEL.displayName} (${PHASE4_SELECTED_LLM_MODEL.filename}) with a ${PHASE4_SELECTED_LLM_MODEL.runtimeTarget}.`,
    );
  },
};
