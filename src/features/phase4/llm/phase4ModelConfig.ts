export const PHASE4_SELECTED_LLM_MODEL = {
  modelId: "qwen2_5_1_5b_instruct_q4_k_m",
  displayName: "Qwen2.5 1.5B Instruct Q4_K_M",
  family: "Qwen2.5",
  parameterSize: "1.5B",
  quantization: "Q4_K_M",
  format: "GGUF",
  filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  sourceRepo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
  sourceUrl:
    "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/dd26da440ef0330c47919d1ecae0966d24022222/qwen2.5-1.5b-instruct-q4_k_m.gguf",
  runtimeTarget: "llama.cpp-compatible local runtime",
  task: "phase4_general_task_form_extraction",
  languages: ["en", "fi"],
  notes:
    "Selected for Phase 4 because it is a small quantized instruction model suitable for local structured extraction on the 6 GB RAM device class.",
} as const;
