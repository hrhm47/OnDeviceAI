import { extractGeneralTaskFormDraft } from "../draft/phase4TaskDraftBuilder";
import { phase4MockLLMProvider } from "../llm/phase4MockLLMProvider";
import { PHASE4_MANUAL_CHECK_CASES, type Phase4ManualCheckCase } from "./phase4ManualCheckCases";

export type Phase4FieldCheckResult = {
  fieldId: string;
  passed: boolean;
  expected: string;
  actual: string;
};

export type Phase4ManualCheckResult = {
  checkId: string;
  passed: boolean;
  fields: Phase4FieldCheckResult[];
};

export const runPhase4ManualChecks = async (
  cases: readonly Phase4ManualCheckCase[] = PHASE4_MANUAL_CHECK_CASES,
) => {
  const results = await Promise.all(cases.map(runCase));
  const passedCount = results.filter((result) => result.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
    summary: `${passedCount}/${results.length} Phase 4 manual checks passed`,
  };
};

const runCase = async (checkCase: Phase4ManualCheckCase) => {
  const result = await extractGeneralTaskFormDraft({
    transcript: checkCase.transcript,
    language: checkCase.language,
    phase4UserId: checkCase.userId,
    provider: phase4MockLLMProvider,
  });
  const draft = result.draft;
  const expected = checkCase.expected;
  const fields = [
    compare("company", expected.companyName, draft.company.value),
    compare("companyStatus", expected.companyStatus, draft.company.status),
    contains("description", expected.descriptionContains, draft.description.value),
    compare("area", expected.areaValue, draft.area.value),
    compare("requiredAction", expected.requiredAction, draft.requiredAction.value),
    compare("dueDate", expected.requiredActionDueDate, draft.requiredActionDueDate.value),
    includesAll("tags", expected.tags, draft.tags.value),
    compare("notifications", expected.notifications, draft.notifications.value),
    compare("reviewWorkIntent", expected.reviewWorkIntent, result.reviewSuggestions.workIntent),
    compare("reviewSpokenDueDateText", expected.reviewSpokenDueDateText, result.reviewSuggestions.spokenDueDateText),
    compare("reviewSpokenCompanyText", expected.reviewSpokenCompanyText, result.reviewSuggestions.spokenCompanyText),
    includesSuggestion("reviewCompany", expected.reviewCompanyName, result.reviewSuggestions.companySuggestions.map((item) => item.displayName ?? "")),
    compare("hybridProjectId", expected.hybridProjectId, result.projectContext?.projectId),
    atLeast("hybridExactCount", expected.hybridMinExactCount, result.hybridRetrieval?.counts.exact),
    includesSuggestion("hybridArea", expected.hybridAreaCandidate, result.hybridRetrieval?.areaCandidates.map((item) => item.value) ?? []),
    includesSuggestion("hybridWorkType", expected.hybridWorkTypeCandidate, result.hybridRetrieval?.workTypeCandidates.map((item) => item.value) ?? []),
  ].filter((field): field is Phase4FieldCheckResult => Boolean(field));

  return {
    checkId: checkCase.checkId,
    passed: fields.every((field) => field.passed),
    fields,
  };
};

const compare = (fieldId: string, expected: unknown, actual: unknown) =>
  expected === undefined
    ? null
    : {
        fieldId,
        passed: expected === actual,
        expected: String(expected),
        actual: String(actual),
      };

const contains = (fieldId: string, expected: string | undefined, actual: string) =>
  expected
    ? {
        fieldId,
        passed: actual.toLowerCase().includes(expected.toLowerCase()),
        expected,
        actual,
      }
    : null;

const includesAll = (fieldId: string, expected: string[] | undefined, actual: string[]) =>
  expected
    ? {
        fieldId,
        passed: expected.every((item) => actual.includes(item)),
        expected: expected.join(" | "),
        actual: actual.join(" | "),
      }
    : null;

const includesSuggestion = (
  fieldId: string,
  expected: string | undefined,
  actual: string[],
) =>
  expected
    ? {
        fieldId,
        passed: actual.includes(expected),
        expected,
        actual: actual.join(" | "),
      }
    : null;

const atLeast = (fieldId: string, expected: number | undefined, actual: number | undefined) =>
  expected === undefined
    ? null
    : {
        fieldId,
        passed: (actual ?? 0) >= expected,
        expected: `>= ${expected}`,
        actual: String(actual ?? 0),
      };
