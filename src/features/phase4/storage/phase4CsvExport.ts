import type { Phase4ExtractionResult } from "../draft/phase4TaskDraftBuilder";

export const PHASE4_EXTRACTION_CSV_FIELDS = [
  "resultId", "timestamp", "phase3ResultId", "language", "transcript",
  "formId", "schemaVersion", "llmProviderId", "method", "promptVersion",
  "extractionTimeMs", "parseSuccess", "validationPassed", "listValue",
  "companyValue", "companyId", "companyStatus", "companyConfidence",
  "descriptionValue", "descriptionStatus", "descriptionConfidence",
  "areaValue", "areaStatus", "areaConfidence", "markerStatus",
  "photosStatus", "requiredActionValue", "requiredActionStatus",
  "requiredActionConfidence", "requiredActionDueDateValue",
  "requiredActionDueDateStatus", "tagsValue", "tagsStatus",
  "impactsStatus", "notificationsValue", "warnings", "errorMessage",
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

const flattenCsvRow = (result: Phase4ExtractionResult) => ({
  resultId: result.resultId,
  timestamp: result.timestamp,
  phase3ResultId: result.phase3ResultId,
  language: result.language,
  transcript: result.transcript,
  formId: result.draft.formId,
  schemaVersion: result.draft.schemaVersion,
  llmProviderId: result.llmProviderId,
  method: result.method,
  promptVersion: result.promptVersion,
  extractionTimeMs: result.extractionTimeMs,
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
  areaStatus: result.draft.area.status,
  areaConfidence: result.draft.area.confidence,
  markerStatus: result.draft.marker.status,
  photosStatus: result.draft.photos.status,
  requiredActionValue: result.draft.requiredAction.value,
  requiredActionStatus: result.draft.requiredAction.status,
  requiredActionConfidence: result.draft.requiredAction.confidence,
  requiredActionDueDateValue: result.draft.requiredActionDueDate.value,
  requiredActionDueDateStatus: result.draft.requiredActionDueDate.status,
  tagsValue: result.draft.tags.value.join(" | "),
  tagsStatus: result.draft.tags.status,
  impactsStatus: result.draft.impacts.status,
  notificationsValue: result.draft.notifications.value,
  warnings: result.warnings.map((item) => `${item.fieldId}:${item.code}`).join(" | "),
  errorMessage: result.errorMessage,
});

const escapeCsvValue = (
  value: string | number | boolean | null | undefined,
) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
