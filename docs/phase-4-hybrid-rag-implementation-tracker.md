# Phase 4 Hybrid RAG Implementation Tracker

## Current branch

`phase4/hybrid-rag-completion`

## Goal

Complete the project-scoped Hybrid RAG runtime path so selected users load their active project context, SQLite/FTS retrieval, optional EmbeddingGemma vectors, and validator-safe candidates.

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
- `src/features/phase4/storage/phase4HybridRagRuntime.ts`
- `src/features/phase4/context/activeProjectContextLoader.ts`
- `src/features/phase4/retrieval/phase4RetrievalTypes.ts`
- `src/features/phase4/retrieval/phase4RetrievalItems.ts`
- `src/features/phase4/retrieval/phase4RetrievalItemRepository.ts`
- `src/features/phase4/retrieval/phase4TranscriptNormalizer.ts`
- `src/features/phase4/retrieval/phase4ExactMatcher.ts`
- `src/features/phase4/retrieval/phase4LexicalRetriever.ts`
- `src/features/phase4/retrieval/phase4ExactLexicalRetriever.ts`
- `src/features/phase4/embeddings/phase4EmbeddingProvider.ts`
- `src/features/phase4/embeddings/phase4EmbeddingGemmaConfig.ts`
- `src/features/phase4/embeddings/phase4EmbeddingGemmaProvider.ts`
- `src/features/phase4/embeddings/phase4VectorMath.ts`
- `src/features/phase4/retrieval/phase4SemanticRetriever.ts`
- `src/features/phase4/retrieval/phase4HybridRetriever.ts`
- `src/features/phase4/draft/phase4TaskDraftBuilder.ts`
- `src/features/phase4/ui/Phase4ExtractionScreen.tsx`
- `src/features/phase4/checks/phase4ManualCheckCases.ts`
- `src/features/phase4/checks/phase4CheckRunner.ts`
- `src/utils/sqlite/hybridRagSqliteSchema.ts`
- `package.json`
- `docs/phase-4-hybrid-rag-implementation-tracker.md`

## Verification commands

- `npx tsc --noEmit`
- `npm run lint`

## Known limitations

- Hybrid RAG is not implemented yet.
- Seed JSON is typed and can be validated, but it is not wired into extraction yet.
- Selected project companies and areas are now used as Phase 4 reference data for validation.
- Manual check summaries include failed field details instead of only pass count.
- Hybrid checks cover Alppila, Tuira, and Nallikari selected-user scenarios.
- Hybrid RAG is the primary source for company and area candidates.
- The old deterministic resolver is fallback on Hybrid RAG failure and gap-fill for action/date/tag.
- Low-confidence Hybrid RAG company/area candidates are not autofilled.
- EmbeddingGemma can be checked/downloaded from the Phase 4 screen, but semantic retrieval still needs vectors.
- SQLite/FTS retrieval can be prepared from the UI and is cached per selected user/project.
- Extraction uses the prepared runtime instead of rebuilding retrieval items/FTS every time.
- The Phase 4 screen can select a seed user/persona and passes that user into extraction.
- Manual checks can use the selected screen user as their default persona.
- Extraction returns active project/user context and Hybrid RAG diagnostics for the UI.
- Existing Phase 4 UI shows retrieval counts, timing, top candidates, and warnings.
- Hybrid retrieval can return candidates, evidence, warnings, timings, and source counts.
- Semantic vector search is enabled only when the EmbeddingGemma GGUF is present and selected-project retrieval item vectors are stored.
- Selecting a Phase 4 user in the UI automatically prepares that user's active project package for RAG.
- Downloading EmbeddingGemma clears the runtime cache and prepares selected-project vectors.
- Hybrid RAG now passes a ready embedding provider into retrieval when vectors are available.
- Exact area ranking prefers specific rooms, trenches, bathrooms, and corridors over broad building/site aliases.
- Project-company context contributes directly to work-type ranking.
- Validator policy prefers medium/high retrieval candidates over mock/LLM guesses for safety-sensitive fields.
- Multi-issue transcripts are treated conservatively and require manual review rather than unsafe action autofill.

## Remaining limitations

- GGUF embedding loading and vector generation require the native app runtime; Node-based checks cannot execute `llama.rn` or `expo-sqlite`.
- Semantic retrieval is optional and exact/lexical retrieval remains the fallback when the model is missing or vector indexing fails.
- Manual checks still run through the in-app button because the extraction path depends on Expo runtime modules.
- Phase 4 still creates an editable draft only; final task editing/submission remains outside this phase.

## Next step

Run manual checks in the app after selecting Timmo, Leena, and a Nallikari user, then verify that downloaded EmbeddingGemma moves the debug state from model-missing/model-ready to semantic-ready after vectors are generated.
