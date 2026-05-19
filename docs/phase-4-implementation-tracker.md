# Phase 4 Implementation Tracker

Implementation started: 2026-05-19, Europe/Helsinki.
Last updated: 2026-05-19 18:49:44 EEST.

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

### `phase4/draft-builder`

- Files added: transcript preparation and main Phase 4 extraction/draft builder.
- Files modified: implementation tracker.
- Checklist: transcript selection order implemented; pipeline returns safe draft even if provider or parser fails; mock provider is default.
- Known limitations: real local provider must be passed explicitly and currently throws placeholder error.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed.

### `phase4/storage-and-export`

- Files added: Phase 4 extraction storage and CSV export.
- Files modified: implementation tracker.
- Checklist: save/load/clear/export functions added; CSV fields match Phase 4 extraction requirements and escape commas/newlines/quotes.
- Known limitations: storage is local JSON file storage only, not a database.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed.

### `phase4/manual-checks`

- Files added: six manual Phase 4 check cases and check runner.
- Files modified: mock provider keyword priority, implementation tracker.
- Checklist: runner uses mock provider and returns pass/fail field summaries.
- Known limitations: checks are manual acceptance helpers, not a formal Jest test suite.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed; compiled runner in `/private/tmp` and confirmed 6/6 manual checks passed.

### `phase4/ui`

- Files added: Phase 4 extraction/debug screen and Expo Router tab route.
- Files modified: tab layout, implementation tracker.
- Checklist: UI supports transcript input, language/provider selection, model info, run/save/export/checks, draft fields, warnings, timing, and raw output toggle.
- Known limitations: local provider path shows placeholder behavior until a real runtime is connected; UI is debug/extraction only, not Phase 5 editing.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed.

### `phase4/docs`

- Files added: Phase 4 data-grounded LLM extraction documentation.
- Files modified: implementation tracker.
- Checklist: docs cover purpose, local-only scope, selected model, GGUF exclusion, schema/reference data, prompt, validator, providers, UI/check usage, known limitations, and future work.
- Known limitations: documentation reflects mock-provider verification; real local inference is not claimed.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed; manual check runner still reports 6/6 passed.

## Final Checklist

- [x] App compiles with TypeScript.
- [x] Existing Phase 1, Phase 2, and Phase 3 files remain in the compile/lint path.
- [x] Phase 4 reference repository returns local datasets.
- [x] Selected model config exists.
- [x] GGUF file is ignored by Git.
- [x] Mock provider returns valid JSON.
- [x] Parser handles JSON safely.
- [x] Validator rejects invented values and forces manual/skipped/default fields.
- [x] Draft builder returns safe draft objects.
- [x] Storage and CSV export compile.
- [x] Manual checks run and summarize results.
- [x] UI screen compiles and is reachable from the tab layout.
- [x] Documentation updated.

Final verification summary:

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- Manual checks: 6/6 passed.
- Validator smoke check: invented company, tag, area, unsupported due date, and `notifications: true` were rejected or forced safe.

### `phase4/local-llm-runtime`

- Files added: none.
- Files modified: `package.json`, `package-lock.json`, `app.json`, local provider, prompt template, Phase 4 UI, Phase 4 docs.
- Checklist: `llama.rn@0.9.7` installed for GGUF inference without enabling React Native New Architecture; Expo plugin added; local provider resolves/downloads the Qwen2.5 GGUF in app documents and runs `initLlama`; UI exposes local provider, model check, and model download.
- Known limitations: native inference still requires a custom Expo development build and the GGUF file on the device; it cannot be verified in Node or Expo Go.
- Verification: `npx tsc --noEmit` passed; `npm run lint` passed; manual check runner still reports 6/6 passed.
