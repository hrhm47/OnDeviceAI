export type Phase4Language = "en" | "fi";

export type Phase4FieldStatus =
  | "extracted"
  | "suggested"
  | "selection_required"
  | "manual_required"
  | "defaulted"
  | "skipped"
  | "not_configured"
  | "rejected";

export type Phase4Confidence = "high" | "medium" | "low" | "none";

export type Phase4AllowedDueDate = "Now" | "+3 days" | "+7 days";

export type Phase4TaskTag =
  | "Environment"
  | "Health"
  | "Induction"
  | "Palokatko"
  | "Quality"
  | "Safety";

export type Phase4RequiredAction =
  | "Fixed"
  | "Hionta"
  | "Kiinnitetään kunnolla"
  | "Kittaus ja maalaus"
  | "Korjaus"
  | "Kuntoon"
  | "Maalataan"
  | "Maalataan uudestaan";

export type Phase4CompanyCategory =
  | "plumbing"
  | "kitchen"
  | "sealing_waterproofing"
  | "flooring"
  | "painting_finishing"
  | "electrical"
  | "hvac_ventilation"
  | "fire_stopping_safety"
  | "cleaning"
  | "masonry_structural"
  | "doors_windows"
  | "doors_locks"
  | "ceiling"
  | "scaffolding"
  | "concrete"
  | "site_logistics"
  | "fall_protection";

export type Phase4WorkIntent = string;

export type Phase4CompanyReference = {
  companyId: string;
  displayName: string;
  primaryCategory: Phase4CompanyCategory;
  secondaryCategories?: Phase4CompanyCategory[];
  responsibilitySummary?: Record<Phase4Language, string>;
  workIntents?: readonly Phase4WorkIntent[];
  roleLabels: Record<Phase4Language, string[]>;
  serviceKeywords: Record<Phase4Language, string[]>;
  actionHints: Record<Phase4Language, Phase4RequiredAction[]>;
  tagHints: Phase4TaskTag[];
  isDefaultForCategory?: boolean;
};

export type Phase4FormFieldPolicy = {
  fieldId: string;
  handling: string;
  allowedValues?: readonly string[];
};

export type Phase4GeneralTaskFormSchema = {
  formId: "general_task_form";
  schemaVersion: "v1";
  displayName: "General Task Form";
  defaultList: "Hallo";
  allowedAreaOptions: readonly string[];
  fields: readonly Phase4FormFieldPolicy[];
};

export type Phase4ExtractionPolicy = {
  policyVersion: "phase4_extraction_policy_v1";
  rules: readonly string[];
};

export type Phase4ReferenceData = {
  formSchema: Phase4GeneralTaskFormSchema;
  companies: readonly Phase4CompanyReference[];
  tags: readonly Phase4TaskTag[];
  requiredActions: readonly Phase4RequiredAction[];
  dueDates: readonly Phase4AllowedDueDate[];
  extractionPolicy: Phase4ExtractionPolicy;
};

export type Phase4CandidateConfidence = "high" | "medium" | "low";

export type Phase4Candidate<T> = {
  value: T;
  confidence: Phase4CandidateConfidence;
  evidence: string;
  reason: string;
  id?: string;
  label?: string;
  matchType?: "exact" | "lexical" | "semantic" | "metadata";
  score?: number;
};

export type Phase4CompanyCandidate = Phase4Candidate<{
  companyId: string;
  displayName: string;
}>;

export type Phase4CandidateResolution = {
  companyCandidates: Phase4CompanyCandidate[];
  areaCandidates: Phase4Candidate<string>[];
  workTypeCandidates?: Phase4Candidate<string>[];
  requiredActionCandidates: Phase4Candidate<Phase4RequiredAction>[];
  dueDateCandidates: Phase4Candidate<Phase4AllowedDueDate>[];
  tagCandidates: Phase4Candidate<Phase4TaskTag>[];
};

export type Phase4LLMField<T> = {
  value: T;
  status: Phase4FieldStatus;
  confidence: Phase4Confidence;
  evidence: string | null;
  reason: string;
};

export type Phase4CompanyReviewSuggestion = {
  companyId: string | null;
  displayName: string | null;
  confidence: Phase4Confidence;
  matchType: "exact" | "nearest" | "manual_review";
  reason: string;
  source: "llm" | "candidate" | "validator";
};

export type Phase4AreaReviewSuggestion = {
  areaId: string;
  displayName: string;
  confidence: Phase4Confidence;
  matchType: "exact" | "lexical" | "semantic" | "metadata" | "nearest";
  reason: string;
  source: "candidate" | "validator";
};

export type Phase4TagReviewSuggestion = {
  tagCode: string;
  displayName: Phase4TaskTag;
  confidence: Phase4Confidence;
  reason: string;
  source: "candidate" | "validator";
};

export type Phase4ReviewSuggestions = {
  workIntent: string | null;
  spokenDueDateText: string | null;
  unsupportedDueDateReason: string | null;
  spokenCompanyText: string | null;
  companySuggestions: Phase4CompanyReviewSuggestion[];
  areaSuggestions: Phase4AreaReviewSuggestion[];
  tagSuggestions: Phase4TagReviewSuggestion[];
  manualReviewReasons: string[];
};

export type GeneralTaskFormDraft = {
  formId: "general_task_form";
  schemaVersion: "v1";
  list: Phase4LLMField<"Hallo">;
  company: Phase4LLMField<string | null> & { companyId: string | null };
  description: Phase4LLMField<string>;
  area: Phase4LLMField<string | null> & { areaId?: string | null };
  marker: Phase4LLMField<null>;
  photos: Phase4LLMField<[]>;
  requiredAction: Phase4LLMField<Phase4RequiredAction | null> & {
    code?: string | null;
  };
  requiredActionDueDate: Phase4LLMField<Phase4AllowedDueDate | string | null> & {
    code?: "now" | "plus_3_days" | "plus_7_days" | null;
    rawText?: string | null;
  };
  tags: Phase4LLMField<Phase4TaskTag[]> & { tagCodes?: string[] };
  impacts: Phase4LLMField<[]>;
  notifications: Phase4LLMField<false>;
};
