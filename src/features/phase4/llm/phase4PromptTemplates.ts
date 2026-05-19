import type { Phase4LLMInput } from "../types/phase4.types";

export const PHASE4_GENERAL_TASK_PROMPT_VERSION =
  "phase4_general_task_prompt_v1" as const;

export const buildPhase4GeneralTaskPrompt = (input: Phase4LLMInput) => {
  const allowedCompanies = input.allowedCompanies.map((company) => ({
    companyId: company.companyId,
    displayName: company.displayName,
    primaryCategory: company.primaryCategory,
    serviceKeywords: company.serviceKeywords,
    actionHints: company.actionHints,
    tagHints: company.tagHints,
  }));

  return [
    "You are extracting fields for a Congrid-style construction task form.",
    "This is controlled extraction, not chat. Return JSON only.",
    "",
    "Rules:",
    "- Use only allowed values from the reference data.",
    "- Do not invent companies or company IDs.",
    "- Do not invent tags.",
    "- Do not invent due dates.",
    "- Fill area only if spoken and matching allowed area options.",
    "- Marker is manual.",
    "- Photos are skipped.",
    "- Notifications are false.",
    "- Every field must include value, status, confidence, evidence, and reason.",
    "",
    `Language: ${input.language}`,
    `Prompt version: ${input.promptVersion}`,
    "",
    "Transcript:",
    input.transcript,
    "",
    "General Task Form schema:",
    JSON.stringify(input.formSchema, null, 2),
    "",
    "Allowed companies:",
    JSON.stringify(allowedCompanies, null, 2),
    "",
    "Allowed tags:",
    JSON.stringify(input.allowedTags, null, 2),
    "",
    "Allowed required actions:",
    JSON.stringify(input.allowedRequiredActions, null, 2),
    "",
    "Allowed due dates:",
    JSON.stringify(input.allowedDueDates, null, 2),
    "",
    "Extraction policy:",
    JSON.stringify(input.extractionPolicy, null, 2),
    "",
    "Return exactly this JSON object shape:",
    JSON.stringify(
      {
        formId: "general_task_form",
        schemaVersion: "v1",
        fields: {
          list: field("Hallo"),
          company: { ...field(null), companyId: null },
          description: field(""),
          area: field(null),
          marker: field(null),
          photos: field([]),
          requiredAction: field(null),
          requiredActionDueDate: field(null),
          tags: field([]),
          impacts: field([]),
          notifications: field(false),
        },
      },
      null,
      2,
    ),
  ].join("\n");
};

const field = (value: unknown) => ({
  value,
  status: "manual_required",
  confidence: "none",
  evidence: null,
  reason: "",
});
