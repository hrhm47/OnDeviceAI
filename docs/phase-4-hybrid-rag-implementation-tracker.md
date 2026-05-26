# Phase 4 Hybrid RAG Implementation Tracker

## Current branch

`phase4/project-area-structures`

## Goal

Replace old full-form Phase 4 prompting with compact project-scoped Hybrid RAG extraction.

## Current Phase 4 modules

- Reference constants: `src/features/phase4/referenceData/*`
- Hybrid retriever: `src/features/phase4/retrieval/phase4HybridRetriever.ts`
- Compact LLM input and prompts: `src/features/phase4/llm/phase4HybridLLMInputBuilder.ts`, `src/features/phase4/llm/buildPhase4HybridExtractionPrompt.ts`
- LLM providers: `src/features/phase4/llm/phase4MockLLMProvider.ts`, `src/features/phase4/llm/phase4LocalLLMProvider.ts`
- Compact parser and draft resolvers: `src/features/phase4/llm/phase4HybridLLMOutputParser.ts`, `src/features/phase4/validation/resolve*.ts`
- Draft builder and transcript preparation: `src/features/phase4/draft/*`
- Storage/export: `src/features/phase4/storage/*`
- UI: `src/features/phase4/ui/Phase4ExtractionScreen.tsx`
- Manual checks: `src/features/phase4/checks/*`
- Project area structures: `src/features/phase4/rag/area/*`

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
- `src/features/phase4/rag/area/projectAreaStructures.ts`
- `src/features/phase4/rag/area/generateProjectAreas.ts`
- `src/features/phase4/rag/area/getGeneratedAreasForProject.ts`
- `src/features/phase4/rag/area/exactAreaMatcher.ts`
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

- The old full-form LLM prompt is no longer active.
- The old deterministic candidate resolver, full-form parser, full-form validator, and dummy company data were removed from the active code path.
- Seed JSON is typed, validated, imported into SQLite, and used as selected-project context.
- Selected project companies and areas are now used as Phase 4 reference data for validation.
- Manual check summaries include failed field details instead of only pass count.
- Hybrid checks cover Alppila, Tuira, and Nallikari selected-user scenarios.
- Hybrid RAG is the primary source for company and area candidates.
- Hybrid RAG is the only extraction authority; the old deterministic resolver is not used as fallback.
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
- Validator/draft builder canonicalizes compact LLM selections and retrieval evidence into the final General Task Form.
- Multi-issue transcripts are treated conservatively and require manual review rather than unsafe action autofill.
- Generated project area structures are available at runtime for Alppila, Tuira, and Nallikari.
- Generated areas include unit rooms, shared floor areas, building-level areas, foundation zones, structural zones, and site areas.
- Exact area matching handles unit rooms, shared floor areas, foundation/site zones, and multi-building ambiguity before semantic retrieval.
- Flexible unsupported dates are preserved for review instead of being deleted.

## Generated area counts

- P1 Alppila: 229 generated areas = 200 unit-room areas, 20 shared floor areas, 5 building-level areas, and 4 site areas.
- P2 Tuira: 290 generated areas = 240 Building A unit-room areas, 24 shared floor areas, 5 building-level areas, 12 foundation zones, 2 structural zones, and 7 site areas.
- P3 Nallikari: 842 generated areas = 800 unit-room areas across Building A studios and Building B apartments, 32 shared floor areas, and 10 building-level areas.

## Area retrieval acceptance checks

- `paint damage on first floor staircase` in Alppila retrieves `Suppose 1 / Floor 1 / Staircase`.
- `cracked tile in apartment A203 bathroom` in Tuira retrieves `Building A / Floor 2 / A203 / Bathroom`.
- `standing water near the north trench` in Tuira retrieves `Building B / North Trench`.
- `exposed cable near temporary power area` in Tuira retrieves `Building B / Temporary Power Area`.
- `moisture near studio S204 kitchen wall` in Nallikari retrieves `Building A / Floor 2 / S204 / Kitchen`.
- `paint damage on first floor staircase` in Nallikari can return Building A and Building B staircase alternatives when no default building is available.

## Remaining limitations

- GGUF embedding loading and vector generation require the native app runtime; Node-based checks cannot execute `llama.rn` or `expo-sqlite`.
- Semantic retrieval is optional and exact/lexical retrieval remains the fallback when the model is missing or vector indexing fails.
- Manual checks still run through the in-app button because the extraction path depends on Expo runtime modules.
- Phase 4 still creates an editable draft only; final task editing/submission remains outside this phase.

## Next step

Run manual checks in the app after selecting Timmo, Leena, and a Nallikari user, then verify that downloaded EmbeddingGemma moves the debug state from model-missing/model-ready to semantic-ready after vectors are generated.
