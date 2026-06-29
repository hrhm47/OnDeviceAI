import type { Phase4ExtractionResult } from "../draft/phase4TaskDraftBuilder";
import type { Phase4Candidate, Phase4CompanyCandidate } from "../types/phase4.types";

// console.log("Testing Phase 4 CSV export with dummy data");

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

type CsvField = (typeof PHASE4_EXTRACTION_CSV_FIELDS)[number];
type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<CsvField, CsvValue>;

export const buildPhase4ExtractionResultsCsv = (
  results: Phase4ExtractionResult[],
) => {
  const safeResults = Array.isArray(results) ? results : [];
  const rows = safeResults.map((result, index) => {
    const flat = flattenCsvRow(result ?? ({} as Phase4ExtractionResult), index);
    return PHASE4_EXTRACTION_CSV_FIELDS.map((field) =>
      escapeCsvValue(flat[field]),
    ).join(",");
  });

  return [PHASE4_EXTRACTION_CSV_FIELDS.join(","), ...rows].join("\n");
};

const flattenCsvRow = (result: Phase4ExtractionResult, index: number): CsvRow => {
  try {
    return flattenCsvRowUnsafe(result, index);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    console.warn("Phase 4 CSV export: failed to flatten row", {
      rowIndex: index,
      resultId: result?.resultId,
      timestamp: result?.timestamp,
      error: text,
    });
    return buildFallbackCsvRow(result, text);
  }
};

const flattenCsvRowUnsafe = (
  result: Phase4ExtractionResult,
  index: number,
): CsvRow => {
  const reviewSuggestions = normalizeReviewSuggestions(result.reviewSuggestions);
  const projectContext = result.projectContext ?? null;
  const retrievalRuntime = result.retrievalRuntime ?? null;
  const hybridRetrieval = result.hybridRetrieval ?? null;
  const draft = result.draft;

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
    formId: draft?.formId,
    schemaVersion: draft?.schemaVersion,
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
    hybridExactCount: hybridRetrieval?.counts?.exact,
    hybridLexicalCount: hybridRetrieval?.counts?.lexical,
    hybridSemanticCount: hybridRetrieval?.counts?.semantic,
    hybridTotalMs: hybridRetrieval?.timings?.totalMs,
    hybridExactMs: hybridRetrieval?.timings?.exactMs,
    hybridLexicalMs: hybridRetrieval?.timings?.lexicalMs,
    hybridSemanticMs: hybridRetrieval?.timings?.semanticMs,
    parseSuccess: result.parseSuccess,
    validationPassed: result.validationPassed,
    listValue: draft?.list?.value,
    companyValue: draft?.company?.value,
    companyId: draft?.company?.companyId,
    companyStatus: draft?.company?.status,
    companyConfidence: draft?.company?.confidence,
    descriptionValue: draft?.description?.value,
    descriptionStatus: draft?.description?.status,
    descriptionConfidence: draft?.description?.confidence,
    areaValue: draft?.area?.value,
    areaId: draft?.area?.areaId,
    areaStatus: draft?.area?.status,
    areaConfidence: draft?.area?.confidence,
    markerStatus: draft?.marker?.status,
    photosStatus: draft?.photos?.status,
    requiredActionValue: draft?.requiredAction?.value,
    requiredActionStatus: draft?.requiredAction?.status,
    requiredActionCode: draft?.requiredAction?.code,
    requiredActionConfidence: draft?.requiredAction?.confidence,
    requiredActionDueDateValue: draft?.requiredActionDueDate?.value,
    requiredActionDueDateCode: draft?.requiredActionDueDate?.code,
    requiredActionDueDateRawText: draft?.requiredActionDueDate?.rawText,
    requiredActionDueDateStatus: draft?.requiredActionDueDate?.status,
    tagsValue: joinCsvList(draft?.tags?.value, "draft.tags.value", result, index),
    tagCodes: joinCsvList(draft?.tags?.tagCodes, "draft.tags.tagCodes", result, index),
    tagsStatus: draft?.tags?.status,
    impactsStatus: draft?.impacts?.status,
    notificationsValue: draft?.notifications?.value,
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
    reviewManualReviewReasons: joinCsvList(
      reviewSuggestions.manualReviewReasons,
      "reviewSuggestions.manualReviewReasons",
      result,
      index,
    ),
    warnings: formatWarnings(result.warnings, result, index),
    errorMessage: result.errorMessage,
  };
};

const buildFallbackCsvRow = (
  result: Phase4ExtractionResult,
  errorMessage: string,
): CsvRow => ({
  resultId: result?.resultId,
  timestamp: result?.timestamp,
  phase3ResultId: result?.phase3ResultId,
  language: result?.language,
  transcript: result?.transcript,
  projectId: result?.projectContext?.projectId,
  projectName: result?.projectContext?.projectName,
  activeUserId: result?.projectContext?.activeUserId,
  activeUserName: result?.projectContext?.activeUserName,
  formId: result?.draft?.formId,
  schemaVersion: result?.draft?.schemaVersion,
  llmProviderId: result?.llmProviderId,
  method: result?.method,
  promptVersion: result?.promptVersion,
  extractionTimeMs: result?.extractionTimeMs,
  retrievalPreparedAt: result?.retrievalRuntime?.preparedAt,
  retrievalItemCount: result?.retrievalRuntime?.retrievalItemCount,
  ftsReady: result?.retrievalRuntime?.ftsReady,
  embeddingModelReady: result?.retrievalRuntime?.embeddingModelReady,
  embeddingVectorCount: result?.retrievalRuntime?.embeddingVectorCount,
  semanticReady: result?.retrievalRuntime?.semanticReady,
  semanticStatusMessage: result?.retrievalRuntime?.semanticStatusMessage,
  hybridExactCount: result?.hybridRetrieval?.counts?.exact,
  hybridLexicalCount: result?.hybridRetrieval?.counts?.lexical,
  hybridSemanticCount: result?.hybridRetrieval?.counts?.semantic,
  hybridTotalMs: result?.hybridRetrieval?.timings?.totalMs,
  hybridExactMs: result?.hybridRetrieval?.timings?.exactMs,
  hybridLexicalMs: result?.hybridRetrieval?.timings?.lexicalMs,
  hybridSemanticMs: result?.hybridRetrieval?.timings?.semanticMs,
  parseSuccess: result?.parseSuccess,
  validationPassed: result?.validationPassed,
  listValue: result?.draft?.list?.value,
  companyValue: result?.draft?.company?.value,
  companyId: result?.draft?.company?.companyId,
  companyStatus: result?.draft?.company?.status,
  companyConfidence: result?.draft?.company?.confidence,
  descriptionValue: result?.draft?.description?.value,
  descriptionStatus: result?.draft?.description?.status,
  descriptionConfidence: result?.draft?.description?.confidence,
  areaValue: result?.draft?.area?.value,
  areaId: result?.draft?.area?.areaId,
  areaStatus: result?.draft?.area?.status,
  areaConfidence: result?.draft?.area?.confidence,
  markerStatus: result?.draft?.marker?.status,
  photosStatus: result?.draft?.photos?.status,
  requiredActionValue: result?.draft?.requiredAction?.value,
  requiredActionStatus: result?.draft?.requiredAction?.status,
  requiredActionCode: result?.draft?.requiredAction?.code,
  requiredActionConfidence: result?.draft?.requiredAction?.confidence,
  requiredActionDueDateValue: result?.draft?.requiredActionDueDate?.value,
  requiredActionDueDateCode: result?.draft?.requiredActionDueDate?.code,
  requiredActionDueDateRawText: result?.draft?.requiredActionDueDate?.rawText,
  requiredActionDueDateStatus: result?.draft?.requiredActionDueDate?.status,
  tagsValue: "",
  tagCodes: "",
  tagsStatus: result?.draft?.tags?.status,
  impactsStatus: result?.draft?.impacts?.status,
  notificationsValue: result?.draft?.notifications?.value,
  reviewWorkIntent: result?.reviewSuggestions?.workIntent,
  reviewSpokenDueDateText: result?.reviewSuggestions?.spokenDueDateText,
  reviewUnsupportedDueDateReason:
    result?.reviewSuggestions?.unsupportedDueDateReason,
  reviewSpokenCompanyText: result?.reviewSuggestions?.spokenCompanyText,
  reviewCompanySuggestions: "",
  reviewAreaSuggestions: "",
  reviewTagSuggestions: "",
  hybridCompanyCandidates: "",
  hybridAreaCandidates: "",
  hybridActionCandidates: "",
  hybridDateCandidates: "",
  hybridTagCandidates: "",
  hybridWorkTypeCandidates: "",
  reviewManualReviewReasons: "",
  warnings: "",
  errorMessage: `CSV row fallback: ${errorMessage}`,
});

const normalizeReviewSuggestions = (
  suggestions: Phase4ExtractionResult["reviewSuggestions"] | null | undefined,
) => ({
  workIntent: suggestions?.workIntent ?? null,
  spokenDueDateText: suggestions?.spokenDueDateText ?? null,
  unsupportedDueDateReason: suggestions?.unsupportedDueDateReason ?? null,
  spokenCompanyText: suggestions?.spokenCompanyText ?? null,
  companySuggestions: safeArray(suggestions?.companySuggestions),
  areaSuggestions: safeArray(suggestions?.areaSuggestions),
  tagSuggestions: safeArray(suggestions?.tagSuggestions),
  manualReviewReasons: safeArray(suggestions?.manualReviewReasons),
});

const formatCompanySuggestions = (
  suggestions: Phase4ExtractionResult["reviewSuggestions"]["companySuggestions"] | null | undefined,
) =>
  safeArray(suggestions)
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
  suggestions: Phase4ExtractionResult["reviewSuggestions"]["areaSuggestions"] | null | undefined,
) =>
  safeArray(suggestions)
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
  suggestions: Phase4ExtractionResult["reviewSuggestions"]["tagSuggestions"] | null | undefined,
) =>
  safeArray(suggestions)
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
  safeArray(candidates)
    .map((item) =>
      compactCsvParts([
        item.value?.displayName,
        item.value?.companyId,
        item.confidence,
        item.matchType,
      ]),
    )
    .join(" | ");

const formatCandidates = (
  candidates: Phase4Candidate<unknown>[] | undefined,
) =>
  safeArray(candidates)
    .map((item) =>
      compactCsvParts([
        String(item.value),
        item.id,
        item.confidence,
        item.matchType,
      ]),
    )
    .join(" | ");

const safeArray = <T,>(value: T[] | readonly T[] | null | undefined): T[] =>
  Array.isArray(value) ? [...value] : [];

const joinCsvList = (
  value: unknown,
  fieldPath: string,
  result: Phase4ExtractionResult,
  index: number,
) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "")).filter(Boolean).join(" | ");
  }

  if (value === null || value === undefined) {
    logMissingCsvArray(fieldPath, result, index);
    return "";
  }

  return String(value);
};

const formatWarnings = (
  warnings: Phase4ExtractionResult["warnings"] | null | undefined,
  result: Phase4ExtractionResult,
  index: number,
) => {
  if (!Array.isArray(warnings)) {
    logMissingCsvArray("warnings", result, index);
    return "";
  }

  return warnings.map((item) => `${item.fieldId}:${item.code}`).join(" | ");
};

const logMissingCsvArray = (
  fieldPath: string,
  result: Phase4ExtractionResult,
  index: number,
) => {
  console.warn("Phase 4 CSV export: missing array field", {
    fieldPath,
    rowIndex: index,
    resultId: result.resultId,
    timestamp: result.timestamp,
  });
};

const compactCsvParts = (
  parts: CsvValue[],
) =>
  parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(":");

const escapeCsvValue = (
  value: CsvValue,
) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
