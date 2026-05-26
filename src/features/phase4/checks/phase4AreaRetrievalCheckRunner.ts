import { loadActiveProjectContext } from "../context/activeProjectContextLoader";
import { retrievePhase4HybridContext } from "../retrieval/phase4HybridRetriever";
import { buildPhase4RetrievalItems } from "../retrieval/phase4RetrievalItems";
import {
  PHASE4_AREA_RETRIEVAL_CHECK_CASES,
  type Phase4AreaRetrievalCheckCase,
} from "./phase4AreaRetrievalCheckCases";

export type Phase4AreaRetrievalCheckResult = {
  checkId: string;
  passed: boolean;
  expected: string[];
  actual: string[];
};

export const runPhase4AreaRetrievalChecks = async (
  cases: readonly Phase4AreaRetrievalCheckCase[] =
    PHASE4_AREA_RETRIEVAL_CHECK_CASES,
) => {
  const results = await Promise.all(cases.map(runAreaRetrievalCase));
  const passed = results.filter((result) => result.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
    summary: `${passed}/${results.length} Phase 4 area retrieval checks passed`,
  };
};

const runAreaRetrievalCase = async (
  checkCase: Phase4AreaRetrievalCheckCase,
): Promise<Phase4AreaRetrievalCheckResult> => {
  const contextResult = loadActiveProjectContext({ userId: checkCase.userId });
  if (!contextResult.ok) {
    return {
      checkId: checkCase.checkId,
      passed: false,
      expected: checkCase.expectedAreaCandidates,
      actual: [contextResult.errorMessage],
    };
  }

  const retrieval = await retrievePhase4HybridContext({
    transcript: checkCase.transcript,
    context: contextResult.context,
    items: buildPhase4RetrievalItems(contextResult.context),
    rebuildLexicalIndex: false,
  });
  const actual = retrieval.areaCandidates.map((candidate) => candidate.value);

  return {
    checkId: checkCase.checkId,
    passed: checkCase.expectedAreaCandidates.every((expected) =>
      actual.includes(expected),
    ),
    expected: checkCase.expectedAreaCandidates,
    actual,
  };
};
