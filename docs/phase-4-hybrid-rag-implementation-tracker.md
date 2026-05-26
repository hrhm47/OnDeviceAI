# Phase 4 Hybrid RAG Implementation Tracker

## Current branch

`phase4/sqlite-schema`

## Goal

Add local SQLite support, apply the Hybrid RAG schema, and scaffold seed import.

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

## Files changed

- `src/features/phase4/data/phase4SeedData.ts`
- `src/features/phase4/data/seed/*.json`
- `src/features/phase4/storage/phase4HybridRagDb.ts`
- `src/utils/sqlite/hybridRagSqliteSchema.ts`
- `package.json`
- `docs/phase-4-hybrid-rag-implementation-tracker.md`

## Verification commands

- `npx tsc --noEmit`
- `npm run lint`

## Known limitations

- Hybrid RAG is not implemented yet.
- Seed JSON is typed and can be validated, but it is not wired into extraction yet.
- SQLite schema initialization and seed import helpers exist but are not wired into UI extraction yet.
- EmbeddingGemma runtime is not wired yet.

## Next step

Create `phase4/project-context-loader` to resolve active user/project context from seed data.
