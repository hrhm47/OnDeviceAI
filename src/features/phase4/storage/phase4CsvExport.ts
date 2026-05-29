import type { Phase4ExtractionResult } from "../draft/phase4TaskDraftBuilder";
import type { Phase4Candidate, Phase4CompanyCandidate } from "../types/phase4.types";

export const PHASE4_EXTRACTION_CSV_FIELDS = [
  "resultId", "timestamp", "phase3ResultId", "language", "transcript",
  "projectId", "projectName", "activeUserId", "activeUserName",
  "formId", "schemaVersion", "llmProviderId", "method", "promptVersion",
  "extractionTimeMs", "retrievalPreparedAt", "retrievalItemCount",
  "ftsReady", "embeddingModelReady", "embeddingVectorCount", "semanticReady",
  "semanticStatusMessage", "hybridExactCount", "hybridLexicalCount",
  "hybridSemanticCount", "hybridTotalMs", "hybridExactMs",
  "hybridLexicalMs", "hybridSemanticMs", "parseSuccess", "validationPassed", "listValue",
  "companyValue", "companyId", "companyStatus", "companyConfidence",
  "descriptionValue", "descriptionStatus", "descriptionConfidence",
  "areaValue", "areaId", "areaStatus", "areaConfidence", "markerStatus",
  "photosStatus", "requiredActionValue", "requiredActionStatus",
  "requiredActionCode", "requiredActionConfidence", "requiredActionDueDateValue",
  "requiredActionDueDateCode", "requiredActionDueDateRawText",
  "requiredActionDueDateStatus", "tagsValue", "tagCodes", "tagsStatus",
  "impactsStatus", "notificationsValue", "reviewWorkIntent",
  "reviewSpokenDueDateText", "reviewUnsupportedDueDateReason",
  "reviewSpokenCompanyText", "reviewCompanySuggestions",
  "reviewAreaSuggestions", "reviewTagSuggestions",
  "hybridCompanyCandidates", "hybridAreaCandidates", "hybridActionCandidates",
  "hybridDateCandidates", "hybridTagCandidates", "hybridWorkTypeCandidates",
  "reviewManualReviewReasons", "warnings", "errorMessage",
] as const;

export const buildPhase4ExtractionResultsCsv = (
  results: Phase4ExtractionResult[],
) => {
  const rows = results.map((result) => {
    const flat = flattenCsvRow(result);
    return PHASE4_EXTRACTION_CSV_FIELDS.map((field) =>
      escapeCsvValue(flat[field]),
    ).join(",");
  });

  return [PHASE4_EXTRACTION_CSV_FIELDS.join(","), ...rows].join("\n");
};

const flattenCsvRow = (result: Phase4ExtractionResult) => {
  const reviewSuggestions = result.reviewSuggestions ?? {
    workIntent: null,
    spokenDueDateText: null,
    unsupportedDueDateReason: null,
    spokenCompanyText: null,
    companySuggestions: [],
    areaSuggestions: [],
    tagSuggestions: [],
    manualReviewReasons: [],
  };
  const projectContext = result.projectContext ?? null;
  const retrievalRuntime = result.retrievalRuntime ?? null;
  const hybridRetrieval = result.hybridRetrieval ?? null;

  return {
    resultId: result.resultId,
    timestamp: result.timestamp,
    phase3ResultId: result.phase3ResultId,
    language: result.language,
    transcript: result.transcript,
    projectId: projectContext?.projectId,
    projectName: projectContext?.projectName,
    activeUserId: projectContext?.activeUserId,
    activeUserName: projectContext?.activeUserName,
    formId: result.draft.formId,
    schemaVersion: result.draft.schemaVersion,
    llmProviderId: result.llmProviderId,
    method: result.method,
    promptVersion: result.promptVersion,
    extractionTimeMs: result.extractionTimeMs,
    retrievalPreparedAt: retrievalRuntime?.preparedAt,
    retrievalItemCount: retrievalRuntime?.retrievalItemCount,
    ftsReady: retrievalRuntime?.ftsReady,
    embeddingModelReady: retrievalRuntime?.embeddingModelReady,
    embeddingVectorCount: retrievalRuntime?.embeddingVectorCount,
    semanticReady: retrievalRuntime?.semanticReady,
    semanticStatusMessage: retrievalRuntime?.semanticStatusMessage,
    hybridExactCount: hybridRetrieval?.counts.exact,
    hybridLexicalCount: hybridRetrieval?.counts.lexical,
    hybridSemanticCount: hybridRetrieval?.counts.semantic,
    hybridTotalMs: hybridRetrieval?.timings.totalMs,
    hybridExactMs: hybridRetrieval?.timings.exactMs,
    hybridLexicalMs: hybridRetrieval?.timings.lexicalMs,
    hybridSemanticMs: hybridRetrieval?.timings.semanticMs,
    parseSuccess: result.parseSuccess,
    validationPassed: result.validationPassed,
    listValue: result.draft.list.value,
    companyValue: result.draft.company.value,
    companyId: result.draft.company.companyId,
    companyStatus: result.draft.company.status,
    companyConfidence: result.draft.company.confidence,
    descriptionValue: result.draft.description.value,
    descriptionStatus: result.draft.description.status,
    descriptionConfidence: result.draft.description.confidence,
    areaValue: result.draft.area.value,
    areaId: result.draft.area.areaId,
    areaStatus: result.draft.area.status,
    areaConfidence: result.draft.area.confidence,
    markerStatus: result.draft.marker.status,
    photosStatus: result.draft.photos.status,
    requiredActionValue: result.draft.requiredAction.value,
    requiredActionStatus: result.draft.requiredAction.status,
    requiredActionCode: result.draft.requiredAction.code,
    requiredActionConfidence: result.draft.requiredAction.confidence,
    requiredActionDueDateValue: result.draft.requiredActionDueDate.value,
    requiredActionDueDateCode: result.draft.requiredActionDueDate.code,
    requiredActionDueDateRawText: result.draft.requiredActionDueDate.rawText,
    requiredActionDueDateStatus: result.draft.requiredActionDueDate.status,
    tagsValue: result.draft.tags.value.join(" | "),
    tagCodes: result.draft.tags.tagCodes?.join(" | "),
    tagsStatus: result.draft.tags.status,
    impactsStatus: result.draft.impacts.status,
    notificationsValue: result.draft.notifications.value,
    reviewWorkIntent: reviewSuggestions.workIntent,
    reviewSpokenDueDateText: reviewSuggestions.spokenDueDateText,
    reviewUnsupportedDueDateReason: reviewSuggestions.unsupportedDueDateReason,
    reviewSpokenCompanyText: reviewSuggestions.spokenCompanyText,
    reviewCompanySuggestions: formatCompanySuggestions(reviewSuggestions.companySuggestions),
    reviewAreaSuggestions: formatAreaSuggestions(reviewSuggestions.areaSuggestions),
    reviewTagSuggestions: formatTagSuggestions(reviewSuggestions.tagSuggestions),
    hybridCompanyCandidates: formatCompanyCandidates(hybridRetrieval?.companyCandidates),
    hybridAreaCandidates: formatCandidates(hybridRetrieval?.areaCandidates),
    hybridActionCandidates: formatCandidates(hybridRetrieval?.actionCandidates),
    hybridDateCandidates: formatCandidates(hybridRetrieval?.dateCandidates),
    hybridTagCandidates: formatCandidates(hybridRetrieval?.tagCandidates),
    hybridWorkTypeCandidates: formatCandidates(hybridRetrieval?.workTypeCandidates),
    reviewManualReviewReasons: reviewSuggestions.manualReviewReasons.join(" | "),
    warnings: result.warnings.map((item) => `${item.fieldId}:${item.code}`).join(" | "),
    errorMessage: result.errorMessage,
  };
};

const formatCompanySuggestions = (
  suggestions: Phase4ExtractionResult["reviewSuggestions"]["companySuggestions"],
) =>
  suggestions
    .map((item) =>
      compactCsvParts([
        item.displayName ?? item.companyId,
        item.companyId,
        item.confidence,
        item.matchType,
      ]),
    )
    .join(" | ");

const formatAreaSuggestions = (
  suggestions: Phase4ExtractionResult["reviewSuggestions"]["areaSuggestions"],
) =>
  suggestions
    .map((item) =>
      compactCsvParts([
        item.displayName,
        item.areaId,
        item.confidence,
        item.matchType,
      ]),
    )
    .join(" | ");

const formatTagSuggestions = (
  suggestions: Phase4ExtractionResult["reviewSuggestions"]["tagSuggestions"],
) =>
  suggestions
    .map((item) =>
      compactCsvParts([
        item.displayName,
        item.tagCode,
        item.confidence,
        "tag",
      ]),
    )
    .join(" | ");

const formatCompanyCandidates = (
  candidates: Phase4CompanyCandidate[] | undefined,
) =>
  candidates
    ?.map((item) =>
      compactCsvParts([
        item.value.displayName,
        item.value.companyId,
        item.confidence,
        item.matchType,
      ]),
    )
    .join(" | ");

const formatCandidates = (
  candidates: Phase4Candidate<unknown>[] | undefined,
) =>
  candidates
    ?.map((item) =>
      compactCsvParts([
        String(item.value),
        item.id,
        item.confidence,
        item.matchType,
      ]),
    )
    .join(" | ");

const compactCsvParts = (
  parts: (string | number | boolean | null | undefined)[],
) =>
  parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(":");

const escapeCsvValue = (
  value: string | number | boolean | null | undefined,
) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
