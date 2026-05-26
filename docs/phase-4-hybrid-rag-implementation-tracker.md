# Phase 4 Hybrid RAG Implementation Tracker

## Current branch

`phase4/current-state-audit`

## Goal

Audit the existing Phase 4 implementation before adding project-scoped Hybrid RAG behavior. This branch does not change runtime behavior.

## Current Phase 4 modules

- Reference data: `src/features/phase4/referenceData/*`
- Candidate resolver: `src/features/phase4/candidates/phase4CandidateResolver.ts`
- LLM input and prompts: `src/features/phase4/llm/phase4LLMInputBuilder.ts`, `src/features/phase4/llm/phase4PromptTemplates.ts`
- LLM providers: `src/features/phase4/llm/phase4MockLLMProvider.ts`, `src/features/phase4/llm/phase4LocalLLMProvider.ts`
- Parser and validator: `src/features/phase4/llm/phase4LLMOutputParser.ts`, `src/features/phase4/validation/phase4DraftValidator.ts`
- Draft builder and transcript preparation: `src/features/phase4/draft/*`
- Storage/export: `src/features/phase4/storage/*`
- UI: `src/features/phase4/ui/Phase4ExtractionScreen.tsx`
- Manual checks: `src/features/phase4/checks/*`

## Seed data observed

- `src/features/phase4/data/seed/projects.v1.json`
- `src/features/phase4/data/seed/users.v1.json`
- `src/features/phase4/data/seed/areas.v1.json`
- `src/features/phase4/data/seed/companies.v1.json`
- `src/features/phase4/data/seed/projectCompanyContext.v1.json`
- `src/features/phase4/data/seed/phase4SeedBundle.v1.json`

These files are intended to become the local project context source for Hybrid RAG.

## Verification commands

- `npx tsc --noEmit`
- `npm run lint`

## Known limitations

- Hybrid RAG is not implemented yet.
- Seed JSON is present locally but not audited or wired yet.
- SQLite, FTS5, and EmbeddingGemma runtime are not wired yet.

## Next step

Create `phase4/seed-data-audit` to add typed seed loading and consistency checks.
