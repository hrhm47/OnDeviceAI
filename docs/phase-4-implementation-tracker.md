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
