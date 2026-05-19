import type { Phase4RawLLMOutput } from "../llm/phase4LLMOutputParser";
import type {
  GeneralTaskFormDraft,
  Phase4Confidence,
  Phase4FieldStatus,
  Phase4LLMField,
  Phase4ReferenceData,
} from "../types/phase4.types";
import {
  filterAllowedTags,
  findAllowedCompany,
  isAllowedArea,
  isAllowedDueDate,
  isAllowedRequiredAction,
} from "./phase4AllowedValueChecks";
import { warning, type Phase4ValidationWarning } from "./phase4Warnings";

export type Phase4ValidationResult = {
  draft: GeneralTaskFormDraft;
  validationPassed: boolean;
  warnings: Phase4ValidationWarning[];
};

export const validateAndBuildTaskFormDraft = (input: {
  parsedOutput: Phase4RawLLMOutput | null;
  transcript: string;
  referenceData: Phase4ReferenceData;
}): Phase4ValidationResult => {
  const warnings: Phase4ValidationWarning[] = [];
  const fields = input.parsedOutput?.fields ?? {};
  const companyField = fields.company;
  const company = findAllowedCompany(
    input.referenceData,
    companyField?.companyId,
    companyField?.value,
  );
  const companyNameSpoken =
    company && input.transcript.toLowerCase().includes(company.displayName.toLowerCase());
  if (!company && (companyField?.companyId || companyField?.value)) {
    warnings.push(warning("company", "rejected_company", "Invented or mismatched company was rejected."));
  }

  const description = stringValue(fields.description?.value) || input.transcript;
  const area = isAllowedArea(input.referenceData, fields.area?.value)
    ? fields.area?.value
    : null;
  if (!area && fields.area?.value) {
    warnings.push(warning("area", "rejected_area", "Area was not in allowed area options."));
  }

  const requiredAction = isAllowedRequiredAction(input.referenceData, fields.requiredAction?.value)
    ? fields.requiredAction.value
    : null;
  if (!requiredAction && fields.requiredAction?.value) {
    warnings.push(warning("requiredAction", "rejected_action", "Required action was not allowed."));
  }

  const dueDate = isAllowedDueDate(input.referenceData, fields.requiredActionDueDate?.value)
    ? fields.requiredActionDueDate.value
    : null;
  if (!dueDate && fields.requiredActionDueDate?.value) {
    warnings.push(warning("requiredActionDueDate", "rejected_due_date", "Due date was not allowed."));
  }

  const tags = filterAllowedTags(input.referenceData, fields.tags?.value);
  if (Array.isArray(fields.tags?.value) && tags.length !== fields.tags.value.length) {
    warnings.push(warning("tags", "rejected_tag", "One or more invented tags were removed."));
  }
  if (fields.notifications?.value === true) {
    warnings.push(warning("notifications", "forced_false", "Notifications are always false in Phase 4."));
  }

  const draft: GeneralTaskFormDraft = {
    formId: "general_task_form",
    schemaVersion: "v1",
    list: field("Hallo", "defaulted", "high", null, "List defaults to Hallo."),
    company: {
      ...field(
        company?.displayName ?? null,
        company ? (companyNameSpoken ? "extracted" : "suggested") : "manual_required",
        company ? (companyNameSpoken ? "high" : "medium") : "none",
        company?.displayName ?? null,
        company ? "Company exists in local allowed database." : "Company must be selected manually.",
      ),
      companyId: company?.companyId ?? null,
    },
    description: field(description, "extracted", "medium", description, "Description is based on transcript or LLM output."),
    area: field(area, area ? "extracted" : "manual_required", area ? "medium" : "none", area, "Area must be spoken and allowed."),
    marker: field(null, "manual_required", "none", null, "Marker is manual only."),
    photos: field([], "skipped", "none", null, "Photos are skipped."),
    requiredAction: field(requiredAction, requiredAction ? "suggested" : "manual_required", requiredAction ? "medium" : "none", requiredAction, "Required action must be allowed."),
    requiredActionDueDate: field(dueDate, dueDate ? "suggested" : "manual_required", dueDate ? "medium" : "none", dueDate, "Due date must be Now, +3 days, or +7 days."),
    tags: field(tags, tags.length ? "suggested" : "manual_required", tags.length ? "medium" : "none", tags.join(", ") || null, "Tags must be allowed."),
    impacts: field([], "not_configured", "none", null, "Impacts are not configured."),
    notifications: field(false, "defaulted", "high", null, "Notifications default to false."),
  };

  return { draft, validationPassed: warnings.length === 0, warnings };
};

const stringValue = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const field = <T,>(
  value: T,
  status: Phase4FieldStatus,
  confidence: Phase4Confidence,
  evidence: string | null,
  reason: string,
): Phase4LLMField<T> => ({ value, status, confidence, evidence, reason });
