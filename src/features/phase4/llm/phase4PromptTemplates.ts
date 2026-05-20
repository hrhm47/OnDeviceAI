import type { Phase4LLMInput } from "../types/phase4.types";

export function buildPhase4ExtractionPrompt(input: Phase4LLMInput): string {
  return `
You are extracting fields for a Congrid-style construction task form.

You must follow these rules:
${input.extractionPolicy.rules.map((rule) => `- ${rule}`).join("\n")}

Prefer these deterministic local candidates when present. Do not choose values outside the allowed lists:
${JSON.stringify(input.candidateResolution ?? {}, null, 2)}

Field constraints:
- company.value must be the company displayName, never the companyId.
- company.companyId must be the matching companyId.
- area.value must be null unless it exactly matches an area candidate or allowed area option.
- Room words such as bathroom, kitchen, corridor, bedroom, or balcony alone are not valid area values.
- marker.value must be null.
- requiredAction.value must be one allowed action or null.
- requiredActionDueDate.value must be Now, +3 days, +7 days, or null.
- tags.value must contain only allowed tags.

Language: ${input.language}

Transcript:
${input.transcript}

Allowed companies:
${JSON.stringify(compactCompanies(input), null, 2)}

Allowed tags:
${JSON.stringify(input.allowedTags, null, 2)}

Allowed required actions:
${JSON.stringify(input.allowedRequiredActions, null, 2)}

Allowed due dates:
${JSON.stringify(input.allowedDueDates, null, 2)}

Return JSON only in this structure:

{
  "formId": "general_task_form",
  "schemaVersion": "v1",
  "fields": {
    "list": {
      "value": "Hallo",
      "status": "defaulted",
      "confidence": "high",
      "evidence": null,
      "reason": "Default list used."
    },
    "company": {
      "value": "AquaPipe Finland Oy",
      "companyId": "company_aquapipe_finland",
      "status": "suggested",
      "confidence": "high",
      "evidence": "pipe leak",
      "reason": "Matched local company candidate."
    },
    "description": {
      "value": "short description from transcript",
      "status": "extracted",
      "confidence": "high",
      "evidence": "transcript phrase",
      "reason": "Description is based on transcript."
    },
    "area": {
      "value": null,
      "status": "manual_required",
      "confidence": "missing",
      "evidence": null,
      "reason": "No allowed area candidate was spoken."
    },
    "marker": {
      "value": null,
      "status": "manual_required",
      "confidence": "missing",
      "evidence": null,
      "reason": "Marker must be selected manually."
    },
    "photos": {
      "value": [],
      "status": "skipped",
      "confidence": "not_applicable",
      "evidence": null,
      "reason": "Photos are skipped in this prototype."
    },
    "requiredAction": {
      "value": "Korjaus",
      "status": "suggested",
      "confidence": "high",
      "evidence": "defect wording",
      "reason": "Repair is an allowed action."
    },
    "requiredActionDueDate": {
      "value": "Now" | "+3 days" | "+7 days" | null,
      "status": "auto_filled" | "manual_required",
      "confidence": "high" | "medium" | "low" | "missing",
      "evidence": string | null,
      "reason": string | null
    },
    "tags": {
      "value": string[],
      "status": "auto_filled" | "suggested" | "manual_required",
      "confidence": "high" | "medium" | "low" | "missing",
      "evidence": string | null,
      "reason": string | null
    },
    "impacts": {
      "value": [],
      "status": "not_configured",
      "confidence": "missing",
      "evidence": null,
      "reason": "Impact options are not configured in Phase 4 v1."
    },
    "notifications": {
      "value": false,
      "status": "defaulted",
      "confidence": "high",
      "evidence": null,
      "reason": "Notifications are false by default."
    }
  },
  "warnings": []
}
`;
}

export const buildPhase4GeneralTaskPrompt = buildPhase4ExtractionPrompt;

const compactCompanies = (input: Phase4LLMInput) => {
  const candidateIds = new Set(
    input.candidateResolution?.companyCandidates.map(
      (candidate) => candidate.value.companyId,
    ) ?? [],
  );
  const companies = candidateIds.size
    ? input.allowedCompanies.filter((company) => candidateIds.has(company.companyId))
    : input.allowedCompanies.slice(0, 5);

  return companies.map((company) => ({
    companyId: company.companyId,
    displayName: company.displayName,
    primaryCategory: company.primaryCategory,
    actionHints: company.actionHints,
    tagHints: company.tagHints,
  }));
};
