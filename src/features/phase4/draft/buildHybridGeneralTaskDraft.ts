import type { Phase4HybridLLMOutput } from "../types/phase4HybridLLM.types";
import type {
  GeneralTaskFormDraft,
  Phase4CandidateResolution,
  Phase4ReviewSuggestions,
} from "../types/phase4.types";
import { resolveAreaField } from "../validation/resolveAreaField";
import { resolveCompanyField } from "../validation/resolveCompanyField";
import { resolveDescription } from "../validation/resolveDescription";
import { resolveDueDate } from "../validation/resolveDueDate";
import { resolveRequiredAction } from "../validation/resolveRequiredAction";
import { resolveTags } from "../validation/resolveTags";
import { warning, type Phase4ValidationWarning } from "../validation/phase4Warnings";

export type Phase4HybridDraftBuildResult = {
  draft: GeneralTaskFormDraft;
  reviewSuggestions: Phase4ReviewSuggestions;
  validationPassed: boolean;
  warnings: Phase4ValidationWarning[];
};

export function buildHybridGeneralTaskDraft(input: {
  transcript: string;
  llmOutput: Phase4HybridLLMOutput | null;
  candidateResolution: Phase4CandidateResolution;
}): Phase4HybridDraftBuildResult {
  const company = resolveCompanyField({
    llmCompanyId: input.llmOutput?.selectedCompanyId ?? null,
    companyCandidates: input.candidateResolution.companyCandidates.map((candidate) => ({
      companyId: candidate.value.companyId,
      displayName: candidate.value.displayName,
      confidence: candidate.confidence,
      evidence: candidate.evidence,
    })),
  });
  const area = resolveAreaField({
    llmAreaId: input.llmOutput?.selectedAreaId ?? null,
    areaCandidates: input.candidateResolution.areaCandidates.map((candidate) => ({
      areaId: candidate.id ?? String(candidate.value),
      displayName: candidate.label ?? String(candidate.value),
      confidence: candidate.confidence,
      matchType: candidate.matchType,
      evidence: candidate.evidence,
    })),
  });
  const description = resolveDescription({
    llmDescription: input.llmOutput?.description ?? null,
    transcript: input.transcript,
  });
  const hasMultipleIssues = Boolean(input.llmOutput?.multiIssueDetected);
  const action = hasMultipleIssues
    ? {
        code: null,
        value: null,
        status: "manual_required" as const,
        confidence: "none" as const,
        reason: "Multiple issues were detected; required action must be reviewed.",
      }
    : resolveRequiredAction({
        transcript: input.transcript,
        llmActionCode: input.llmOutput?.requiredActionCode ?? null,
        actionCandidates: input.candidateResolution.requiredActionCandidates.map((candidate) => ({
          id: candidate.id ?? String(candidate.value),
          label: candidate.label ?? String(candidate.value),
          confidence: candidate.confidence,
        })),
      });
  const dueDate = resolveDueDate({
    transcript: input.transcript,
    llmDueDateCode: input.llmOutput?.dueDateCode ?? null,
    reviewNotes: input.llmOutput?.reviewNotes ?? [],
  });
  const tags = resolveTags({
    transcript: input.transcript,
    llmTagCodes: input.llmOutput?.tagCodes ?? [],
    tagCandidates: input.candidateResolution.tagCandidates.map((candidate) => ({
      id: candidate.id ?? String(candidate.value).toLowerCase(),
      label: candidate.label ?? String(candidate.value),
    })),
  });
  const warningTexts = [...company.warnings, ...area.warnings];
  const warnings = warningTexts.map((message, index) =>
    warning("hybrid", `hybrid_warning_${index + 1}`, message),
  );
  const reviewNotes = Array.from(
    new Set([
      ...company.reviewNotes,
      ...area.reviewNotes,
      ...dueDate.reviewNotes,
      ...(input.llmOutput?.reviewNotes ?? []),
      ...(hasMultipleIssues
        ? ["Multiple separate issues were detected; review before creating a task."]
        : []),
    ]),
  );

  const draft: GeneralTaskFormDraft = {
    formId: "general_task_form",
    schemaVersion: "v1",
    list: field("Hallo", "defaulted", "high", null, "List defaults to Hallo."),
    company: {
      ...field(company.value, company.status, company.confidence, company.value, company.reason),
      companyId: company.companyId,
    },
    description: field(description.value, description.status, description.confidence, description.value, description.reason),
    area: {
      ...field(area.value, area.status, area.confidence, area.value, area.reason),
      areaId: area.areaId,
    },
    marker: field(null, "manual_required", "none", null, "Marker is manual only."),
    photos: field([], "skipped", "none", null, "Photos are skipped."),
    requiredAction: {
      ...field(action.value, action.status, action.confidence, action.value, action.reason),
      code: action.code,
    },
    requiredActionDueDate: {
      ...field(dueDate.value, dueDate.status, dueDate.confidence, dueDate.rawText ?? dueDate.value, dueDate.reason),
      code: dueDate.code,
      rawText: dueDate.rawText,
    },
    tags: {
      ...field(tags.value, tags.status, tags.confidence, tags.value.join(", ") || null, tags.reason),
      tagCodes: tags.tagCodes,
    },
    impacts: field([], "not_configured", "none", null, "Impacts are not configured."),
    notifications: field(false, "defaulted", "high", null, "Notifications default to false."),
  };

  return {
    draft,
    reviewSuggestions: {
      workIntent: input.candidateResolution.workTypeCandidates?.[0]?.value ?? null,
      spokenDueDateText: dueDate.rawText,
      unsupportedDueDateReason: dueDate.rawText
        ? "The spoken due date is preserved for user review because it is not a canonical allowed shortcut."
        : null,
      spokenCompanyText: null,
      companySuggestions: input.candidateResolution.companyCandidates.slice(0, 3).map((candidate) => ({
        companyId: candidate.value.companyId,
        displayName: candidate.value.displayName,
        confidence: candidate.confidence,
        matchType: "nearest",
        reason: candidate.reason,
        source: "candidate",
      })),
      manualReviewReasons: reviewNotes,
    },
    validationPassed: warnings.length === 0,
    warnings,
  };
}

const field = <T,>(
  value: T,
  status: GeneralTaskFormDraft["list"]["status"],
  confidence: GeneralTaskFormDraft["list"]["confidence"],
  evidence: string | null,
  reason: string,
) => ({ value, status, confidence, evidence, reason });
