import type { Phase4RawLLMOutput } from "../llm/phase4LLMOutputParser";
import type {
  GeneralTaskFormDraft,
  Phase4CandidateConfidence,
  Phase4CandidateResolution,
  Phase4Confidence,
  Phase4FieldStatus,
  Phase4LLMField,
  Phase4ReferenceData,
  Phase4ReviewSuggestions,
  Phase4CompanyReviewSuggestion,
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
  reviewSuggestions: Phase4ReviewSuggestions;
  validationPassed: boolean;
  warnings: Phase4ValidationWarning[];
};

export const validateAndBuildTaskFormDraft = (input: {
  parsedOutput: Phase4RawLLMOutput | null;
  transcript: string;
  referenceData: Phase4ReferenceData;
  candidateResolution?: Phase4CandidateResolution;
}): Phase4ValidationResult => {
  const warnings: Phase4ValidationWarning[] = [];
  const fields = input.parsedOutput?.fields ?? {};
  const companyField = fields.company;
  const llmCompany = findAllowedCompany(
    input.referenceData,
    companyField?.companyId,
    companyField?.value,
  );
  const companyCandidate = input.candidateResolution?.companyCandidates[0];
  const company =
    llmCompany ??
    input.referenceData.companies.find(
      (item) => item.companyId === companyCandidate?.value.companyId,
    ) ??
    null;
  const companyNameSpoken =
    company &&
    input.transcript.toLowerCase().includes(company.displayName.toLowerCase());
  if (!llmCompany && (companyField?.companyId || companyField?.value)) {
    warnings.push(
      warning(
        "company",
        "rejected_company",
        "Invented or mismatched company was rejected.",
      ),
    );
  }

  const description = stringValue(fields.description?.value) || input.transcript;
  const areaCandidate = input.candidateResolution?.areaCandidates[0];
  const llmArea = fields.area?.value;
  let area: string | null = areaCandidate?.value ?? null;
  if (isAllowedArea(input.referenceData, llmArea)) {
    area = llmArea;
  } else if (isCandidateArea(areaCandidate, llmArea)) {
    area = llmArea;
  }
  const hasAreaFromLlm =
    area === llmArea &&
    (isAllowedArea(input.referenceData, llmArea) ||
      isCandidateArea(areaCandidate, llmArea));
  if (!hasAreaFromLlm && llmArea) {
    warnings.push(
      warning("area", "rejected_area", "Area was not in allowed area options."),
    );
  }

  const actionCandidate = input.candidateResolution?.requiredActionCandidates[0];
  const requiredAction = isAllowedRequiredAction(
    input.referenceData,
    fields.requiredAction?.value,
  )
    ? fields.requiredAction.value
    : (actionCandidate?.value ?? null);
  if (
    !isAllowedRequiredAction(input.referenceData, fields.requiredAction?.value) &&
    fields.requiredAction?.value
  ) {
    warnings.push(
      warning(
        "requiredAction",
        "rejected_action",
        "Required action was not allowed.",
      ),
    );
  }

  const dueDateCandidate = input.candidateResolution?.dueDateCandidates[0];
  const dueDate = isAllowedDueDate(
    input.referenceData,
    fields.requiredActionDueDate?.value,
  )
    ? fields.requiredActionDueDate.value
    : (dueDateCandidate?.value ?? null);
  if (
    !isAllowedDueDate(input.referenceData, fields.requiredActionDueDate?.value) &&
    fields.requiredActionDueDate?.value
  ) {
    warnings.push(
      warning(
        "requiredActionDueDate",
        "rejected_due_date",
        "Due date was not allowed.",
      ),
    );
  }

  const llmTags = filterAllowedTags(input.referenceData, fields.tags?.value);
  const candidateTags =
    input.candidateResolution?.tagCandidates.map((candidate) => candidate.value) ??
    [];
  const tags = llmTags.length ? llmTags : Array.from(new Set(candidateTags));
  if (
    Array.isArray(fields.tags?.value) &&
    llmTags.length !== fields.tags.value.length
  ) {
    warnings.push(
      warning("tags", "rejected_tag", "One or more invented tags were removed."),
    );
  }
  if (fields.notifications?.value === true) {
    warnings.push(
      warning(
        "notifications",
        "forced_false",
        "Notifications are always false in Phase 4.",
      ),
    );
  }
  const reviewSuggestions = buildReviewSuggestions({
    parsedOutput: input.parsedOutput,
    transcript: input.transcript,
    referenceData: input.referenceData,
    candidateResolution: input.candidateResolution,
    llmCompany,
    company,
    companyField,
    dueDateField: fields.requiredActionDueDate,
  });

  const companyConfidence = llmCompany
    ? companyNameSpoken
      ? "high"
      : "medium"
    : candidateConfidence(companyCandidate?.confidence);
  const companyStatus = company
    ? companyNameSpoken
      ? "extracted"
      : "suggested"
    : "manual_required";
  const areaConfidence = hasAreaFromLlm
    ? "medium"
    : candidateConfidence(areaCandidate?.confidence);
  const actionConfidence = isAllowedRequiredAction(
    input.referenceData,
    fields.requiredAction?.value,
  )
    ? "medium"
    : candidateConfidence(actionCandidate?.confidence);
  const dueDateConfidence = isAllowedDueDate(
    input.referenceData,
    fields.requiredActionDueDate?.value,
  )
    ? "medium"
    : candidateConfidence(dueDateCandidate?.confidence);
  const tagConfidence = llmTags.length
    ? "medium"
    : candidateConfidence(input.candidateResolution?.tagCandidates[0]?.confidence);

  const draft: GeneralTaskFormDraft = {
    formId: "general_task_form",
    schemaVersion: "v1",
    list: field("Hallo", "defaulted", "high", null, "List defaults to Hallo."),
    company: {
      ...field(
        company?.displayName ?? null,
        companyStatus,
        companyConfidence,
        companyCandidate?.evidence ?? company?.displayName ?? null,
        llmCompany
          ? "Company exists in local allowed database."
          : (companyCandidate?.reason ?? "Company must be selected manually."),
      ),
      companyId: company?.companyId ?? null,
    },
    description: field(
      description,
      "extracted",
      "medium",
      description,
      "Description is based on transcript or LLM output.",
    ),
    area: field(
      area,
      area ? "extracted" : "manual_required",
      area ? areaConfidence : "none",
      areaCandidate?.evidence ?? area,
      areaCandidate?.reason ?? "Area must be spoken and allowed.",
    ),
    marker: field(null, "manual_required", "none", null, "Marker is manual only."),
    photos: field([], "skipped", "none", null, "Photos are skipped."),
    requiredAction: field(
      requiredAction,
      requiredAction ? "suggested" : "manual_required",
      requiredAction ? actionConfidence : "none",
      actionCandidate?.evidence ?? requiredAction,
      actionCandidate?.reason ?? "Required action must be allowed.",
    ),
    requiredActionDueDate: field(
      dueDate,
      dueDate ? "suggested" : "manual_required",
      dueDate ? dueDateConfidence : "none",
      dueDateCandidate?.evidence ?? dueDate,
      dueDateCandidate?.reason ??
        "Due date must be Now, +3 days, or +7 days.",
    ),
    tags: field(
      tags,
      tags.length ? "suggested" : "manual_required",
      tags.length ? tagConfidence : "none",
      tags.join(", ") || null,
      "Tags must be allowed.",
    ),
    impacts: field([], "not_configured", "none", null, "Impacts are not configured."),
    notifications: field(
      false,
      "defaulted",
      "high",
      null,
      "Notifications default to false.",
    ),
  };

  return {
    draft,
    reviewSuggestions,
    validationPassed: warnings.length === 0,
    warnings,
  };
};

const buildReviewSuggestions = (input: {
  parsedOutput: Phase4RawLLMOutput | null;
  transcript: string;
  referenceData: Phase4ReferenceData;
  candidateResolution?: Phase4CandidateResolution;
  llmCompany: Phase4ReferenceData["companies"][number] | null;
  company: Phase4ReferenceData["companies"][number] | null;
  companyField: Phase4RawLLMOutput["fields"][string] | undefined;
  dueDateField: Phase4RawLLMOutput["fields"][string] | undefined;
}): Phase4ReviewSuggestions => {
  const rawSuggestions = input.parsedOutput?.reviewSuggestions ?? {};
  const spokenDueDateText =
    stringValue(rawSuggestions.spokenDueDateText) ??
    unsupportedDueDateText(input.dueDateField?.value) ??
    detectUnsupportedDueDate(input.transcript);
  const spokenCompanyText =
    stringValue(rawSuggestions.spokenCompanyText) ??
    detectUnsupportedCompanyText(input.transcript, input.referenceData) ??
    (!input.llmCompany && input.companyField?.value
      ? stringValue(input.companyField.value)
      : null);
  const manualReviewReasons = stringArray(rawSuggestions.manualReviewReasons);

  if (spokenDueDateText) {
    manualReviewReasons.push(
      `${spokenDueDateText} was spoken but is not one of the allowed due date options.`,
    );
  }
  if (spokenCompanyText) {
    manualReviewReasons.push(
      `${spokenCompanyText} was spoken or suggested but is not an exact allowed company match.`,
    );
  }

  return {
    workIntent:
      stringValue(rawSuggestions.workIntent) ??
      inferWorkIntent(input.transcript, input.company, input.candidateResolution),
    spokenDueDateText,
    unsupportedDueDateReason: spokenDueDateText
      ? "The spoken due date is useful for review but cannot be written into the strict due date field."
      : stringValue(rawSuggestions.unsupportedDueDateReason),
    spokenCompanyText,
    companySuggestions: buildCompanyReviewSuggestions(input, rawSuggestions),
    manualReviewReasons: Array.from(new Set(manualReviewReasons)),
  };
};

const buildCompanyReviewSuggestions = (
  input: {
    parsedOutput: Phase4RawLLMOutput | null;
    referenceData: Phase4ReferenceData;
    candidateResolution?: Phase4CandidateResolution;
    llmCompany: Phase4ReferenceData["companies"][number] | null;
    company: Phase4ReferenceData["companies"][number] | null;
  },
  rawSuggestions: Record<string, unknown>,
): Phase4CompanyReviewSuggestion[] => {
  const seen = new Set<string>();
  const suggestions: Phase4CompanyReviewSuggestion[] = [];
  const push = (suggestion: Phase4CompanyReviewSuggestion) => {
    const key = suggestion.companyId ?? suggestion.displayName ?? suggestion.reason;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(suggestion);
    }
  };

  for (const companyId of stringArray(rawSuggestions.suggestedCompanyIds)) {
    const company = input.referenceData.companies.find(
      (item) => item.companyId === companyId,
    );
    if (company) {
      push({
        companyId: company.companyId,
        displayName: company.displayName,
        confidence: "medium",
        matchType: input.llmCompany?.companyId === company.companyId ? "exact" : "nearest",
        reason: "LLM suggested this allowed local company for user review.",
        source: "llm",
      });
    }
  }

  if (input.company) {
    push({
      companyId: input.company.companyId,
      displayName: input.company.displayName,
      confidence: input.llmCompany ? "medium" : "low",
      matchType: input.llmCompany ? "exact" : "nearest",
      reason: input.llmCompany
        ? "Company exists in the allowed database."
        : "Closest local candidate from deterministic responsibility matching.",
      source: input.llmCompany ? "llm" : "candidate",
    });
  }

  for (const candidate of input.candidateResolution?.companyCandidates.slice(0, 3) ?? []) {
    push({
      companyId: candidate.value.companyId,
      displayName: candidate.value.displayName,
      confidence: candidateConfidence(candidate.confidence),
      matchType: "nearest",
      reason: candidate.reason,
      source: "candidate",
    });
  }

  return suggestions;
};

const inferWorkIntent = (
  transcript: string,
  company: Phase4ReferenceData["companies"][number] | null,
  candidateResolution: Phase4CandidateResolution | undefined,
) => {
  const normalizedTranscript = normalizeText(transcript);
  const intents =
    company?.workIntents ??
    candidateResolution?.companyCandidates.flatMap((candidate) => {
      const evidence = normalizeText(candidate.evidence);
      return evidence ? [evidence.replace(/\s+/g, "_")] : [];
    }) ??
    [];

  return (
    intents.find((intent) => normalizedTranscript.includes(normalizeText(intent))) ??
    null
  );
};

const unsupportedDueDateText = (value: unknown) => {
  const text = stringValue(value);
  return text && !["Now", "+3 days", "+7 days"].includes(text) ? text : null;
};

const detectUnsupportedDueDate = (transcript: string) => {
  const normalized = normalizeText(transcript);
  if (normalized.includes("tomorrow") || normalized.includes("huomenna")) {
    return normalized.includes("huomenna") ? "huomenna" : "tomorrow";
  }
  return null;
};

const detectUnsupportedCompanyText = (
  transcript: string,
  referenceData: Phase4ReferenceData,
) => {
  const match = transcript.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3}\s+(?:Company|Oy|Ltd|Inc))\b/);
  const spoken = match?.[1]?.trim() ?? null;
  if (!spoken) {
    return null;
  }

  const isAllowed = referenceData.companies.some(
    (company) => normalizeText(company.displayName) === normalizeText(spoken),
  );
  return isAllowed ? null : spoken;
};

const isCandidateArea = (
  candidate: Phase4CandidateResolution["areaCandidates"][number] | undefined,
  value: unknown,
): value is string => typeof value === "string" && candidate?.value === value;

const candidateConfidence = (
  confidence?: Phase4CandidateConfidence,
): Phase4Confidence => confidence ?? "none";

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/.,:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const field = <T,>(
  value: T,
  status: Phase4FieldStatus,
  confidence: Phase4Confidence,
  evidence: string | null,
  reason: string,
): Phase4LLMField<T> => ({ value, status, confidence, evidence, reason });
