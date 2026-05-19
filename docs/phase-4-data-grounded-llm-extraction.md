# Phase 4 Data-Grounded Local LLM Extraction

## Purpose

Phase 4 starts the transition from ASR transcript to a structured Congrid-style General Task Form draft. It is not a chatbot and it does not submit tasks automatically. It creates a partial draft for user review, editing, and confirmation.

The pipeline is:

```text
Phase 3 transcript
-> transcript preparation
-> local reference data
-> controlled LLM input and prompt
-> LLM provider
-> JSON parser
-> validator
-> General Task Form draft
-> local storage / CSV export
-> debug UI / manual checks
```

## Local-Only Scope

Phase 4 v1 uses local TypeScript reference files only. It does not use cloud LLMs, the OpenAI API, Supabase, remote databases, remote storage, local SQLite, GPS/location detection, marker auto-placement, photo processing, or automatic report submission.

## Selected Model

The selected first local extraction model is `Qwen2.5-1.5B-Instruct-GGUF` with `Q4_K_M` quantization.

- Config: `src/features/phase4/llm/phase4ModelConfig.ts`
- Expected file: `models/llm/qwen2_5_1_5b_instruct_q4_k_m/qwen2.5-1.5b-instruct-q4_k_m.gguf`
- Source URL: `https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/dd26da440ef0330c47919d1ecae0966d24022222/qwen2.5-1.5b-instruct-q4_k_m.gguf`

The GGUF file is not committed because model binaries are large local runtime assets. The ignore rule is `models/llm/**/*.gguf`.

Qwen2.5 Q4_K_M is selected as the first practical local model for the target device class, but extraction quality still needs measurement.

## Form Schema And Reference Data

The v1 form is `General Task Form` with schema version `v1`.

Reference data lives under `src/features/phase4/referenceData` and includes:

- allowed companies
- allowed tags
- allowed required actions
- allowed due date options
- allowed area options
- extraction policy

Companies, tags, actions, due dates, and areas must come from allowed local data. Area is only filled if spoken and allowed.

## Prompt And Validation

The prompt version is `phase4_general_task_prompt_v1`. The LLM input package includes transcript, form schema, allowed values, extraction policy, and a strict JSON output shape.

The LLM is not trusted blindly. The parser safely handles invalid JSON, and the validator rebuilds the draft from allowed local data.

Manual/skipped/default fields:

- `list`: default `Hallo`
- `marker`: manual only
- `photos`: skipped
- `impacts`: not configured
- `notifications`: false by default

## Providers

The mock provider is deterministic, local-only, and used for manual checks and UI smoke testing.

The local provider uses `llama.rn`, a React Native binding for `llama.cpp`, to run the selected GGUF model on device. This requires a custom native Expo development build; Expo Go cannot load this native runtime.

The model file must exist inside the app document directory:

```text
<documentDirectory>/models/llm/qwen2_5_1_5b_instruct_q4_k_m/qwen2.5-1.5b-instruct-q4_k_m.gguf
```

The Phase 4 UI can check this path and download the selected GGUF file from the configured Hugging Face source URL. Inference remains local after the model file is present.

## Running Phase 4

Use the Phase 4 tab in the app:

1. Enter or paste a transcript.
2. Select English or Finnish.
3. Use the mock provider for current verified behavior.
4. For local inference, check/download the model first.
5. Run extraction.
6. Review extracted fields, statuses, confidence, warnings, and raw output.
7. Save locally or export CSV.

Manual checks can be run from the Phase 4 UI. The check runner is implemented in `src/features/phase4/checks/phase4CheckRunner.ts`.

## Known Limitations

- Real local LLM inference requires a custom native build and a downloaded/copied GGUF file on the device.
- Company data is dummy local thesis reference data.
- Candidate retrieval is keyword-based in the mock provider only.
- No local database is used in v1.
- The UI is a debug extraction screen, not a Phase 5 editable preview.

Future improvements:

- performance tuning for the local LLM runtime
- candidate retrieval
- local database
- Phase 5 editable preview
