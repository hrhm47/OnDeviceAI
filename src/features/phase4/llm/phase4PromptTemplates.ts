import type { Phase4LLMInput } from "../types/phase4.types";

export function buildPhase4ExtractionPrompt(input: Phase4LLMInput): string {
  return `
You are extracting fields for a Congrid-style construction task form.

You must follow these rules:
${input.extractionPolicy.rules.map((rule) => `- ${rule}`).join("\n")}

Language: ${input.language}

Transcript:
${input.transcript}

Target form:
${JSON.stringify(input.formSchema, null, 2)}

Allowed companies:
${JSON.stringify(input.allowedCompanies, null, 2)}

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
      "value": string | null,
      "companyId": string | null,
      "status": "auto_filled" | "suggested" | "manual_required",
      "confidence": "high" | "medium" | "low" | "missing",
      "evidence": string | null,
      "reason": string | null
    },
    "description": {
      "value": string | null,
      "status": "auto_filled" | "manual_required",
      "confidence": "high" | "medium" | "low" | "missing",
      "evidence": string | null,
      "reason": string | null
    },
    "area": {
      "value": string | null,
      "status": "auto_filled" | "manual_required",
      "confidence": "high" | "medium" | "low" | "missing",
      "evidence": string | null,
      "reason": string | null
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
      "value": string | null,
      "status": "auto_filled" | "suggested" | "manual_required",
      "confidence": "high" | "medium" | "low" | "missing",
      "evidence": string | null,
      "reason": string | null
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
