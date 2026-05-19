# Phase 4 Implementation Tracker

Implementation started: 2026-05-19, Europe/Helsinki.

## Selected Model

- Model: Qwen2.5-1.5B-Instruct-GGUF
- Quantization: Q4_K_M
- Filename: `qwen2.5-1.5b-instruct-q4_k_m.gguf`
- Source repo: `Qwen/Qwen2.5-1.5B-Instruct-GGUF`
- Source URL: `https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/dd26da440ef0330c47919d1ecae0966d24022222/qwen2.5-1.5b-instruct-q4_k_m.gguf`
- Status: selected for Phase 4 local structured extraction; GGUF file not committed.

## Audit Findings Reused

- Phase 1 ASR result types: `src/features/asr/types/asr.types.ts`
- Phase 3 result types: `src/features/asr/phase3/nativeASRPhase3.types.ts`
- Phase 3 storage/export pattern: `src/features/asr/phase3/phase3NativeASRStorage.ts`
- Phase 2 manual storage/export pattern: `src/features/asr/asrTesting/services/manualAsrTestingStorage.ts`
- Navigation pattern: Expo Router tabs in `app/(tabs)/_layout.tsx`
- Local model utilities: ASR-only utilities exist; no Phase 4 LLM runtime exists yet.

## Branch Log

### `phase4/types-and-reference-data`

- Files added: Phase 4 types, General Task Form v1 schema, company/tag/action/due-date/reference policy data, reference repository.
- Files modified: none.
- Checklist: reference repository added; no UI/provider/parser work included.
- Known limitations: dummy company data is local v1 thesis data, not a production Congrid dataset.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed.

### `phase4/model-config`

- Files added: selected Phase 4 LLM model config and local model folder README.
- Files modified: `.gitignore`, implementation tracker.
- Checklist: GGUF ignore rule added; selected model metadata exported; no runtime inference claimed.
- Known limitations: real local llama.cpp-compatible runtime is not connected yet.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed; `.gitignore` contains `models/llm/**/*.gguf`.

### `phase4/llm-input-and-prompt`

- Files added: Phase 4 LLM input builder and prompt template.
- Files modified: implementation tracker.
- Checklist: prompt includes transcript, model task rules, allowed companies/tags/actions/dates, schema, policy, and JSON shape.
- Known limitations: prompt builder does not call a model; provider work is separate.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed; prompt sections confirmed with `rg`.

### `phase4/llm-provider-interface`

- Files added: provider interface, deterministic mock provider, local Qwen provider placeholder.
- Files modified: implementation tracker.
- Checklist: mock provider returns JSON; local provider does not fake inference; no cloud API imported.
- Known limitations: real local LLM runtime is still not connected.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed; scan found no cloud API imports in provider files.

### `phase4/parser-and-validator`

- Files added: safe LLM JSON parser, allowed value checks, draft validator, validation warning type.
- Files modified: implementation tracker.
- Checklist: invented companies/tags/areas/due dates are rejected or removed; marker/photos/impacts/notifications are forced to Phase 4 policy.
- Known limitations: validator is deterministic local rules, not semantic retrieval.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed.
