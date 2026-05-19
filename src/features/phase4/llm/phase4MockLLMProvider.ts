import type { Phase4LLMInput } from "../types/phase4.types";
import type { Phase4LLMProvider } from "./phase4LLMProvider";

export const phase4MockLLMProvider: Phase4LLMProvider = {
  providerId: "phase4_mock_llm_provider_v1",
  method: "mock_llm_with_validation",
  async extractTaskForm(input) {
    const startedAt = Date.now();
    return {
      rawText: JSON.stringify(buildMockOutput(input), null, 2),
      durationMs: Date.now() - startedAt,
    };
  },
};

const buildMockOutput = (input: Phase4LLMInput) => {
  const text = input.transcript.toLowerCase();
  const company = pickCompany(input, text);
  const action = text.includes("paint") || text.includes("scratch") || text.includes("naarmu")
    ? "Maalataan uudestaan"
    : text.includes("sealant") || text.includes("sauma")
      ? "Kittaus ja maalaus"
      : "Korjaus";
  const dueDate = text.includes("today") || text.includes("tänään") || text.includes("safety")
    ? "Now"
    : text.includes("three days") || text.includes("kolme")
      ? "+3 days"
      : text.includes("week") || text.includes("viikko")
        ? "+7 days"
        : null;
  const tags = [
    ...(text.includes("palokatko") || text.includes("fire stop") ? ["Palokatko", "Safety"] : []),
    ...(text.includes("safety") || text.includes("turvallisuus") ? ["Safety"] : []),
    ...(!text.includes("safety") && !text.includes("turvallisuus") ? ["Quality"] : []),
  ];

  return {
    formId: "general_task_form",
    schemaVersion: "v1",
    fields: {
      list: field("Hallo", "defaulted", "high", null, "Default list for Phase 4."),
      company: {
        ...field(company?.displayName ?? null, company ? "suggested" : "manual_required", company ? "medium" : "none", company?.displayName ?? null, company ? "Matched transcript keywords to local company reference data." : "No local company match found."),
        companyId: company?.companyId ?? null,
      },
      description: field(input.transcript, "extracted", "medium", input.transcript, "Description is based on the transcript."),
      area: field(pickArea(input, text), pickArea(input, text) ? "extracted" : "manual_required", pickArea(input, text) ? "medium" : "none", pickArea(input, text), "Area is filled only when an allowed area is spoken."),
      marker: field(null, "manual_required", "none", null, "Marker must be selected manually."),
      photos: field([], "skipped", "none", null, "Photos are outside Phase 4 extraction."),
      requiredAction: field(action, "suggested", "medium", input.transcript, "Suggested from transcript and company hints."),
      requiredActionDueDate: field(dueDate, dueDate ? "suggested" : "manual_required", dueDate ? "medium" : "none", dueDate, "Due date must be one of the allowed options."),
      tags: field(Array.from(new Set(tags)), "suggested", "medium", input.transcript, "Tags are limited to allowed local tags."),
      impacts: field([], "not_configured", "none", null, "Impacts are not configured."),
      notifications: field(false, "defaulted", "high", null, "Notifications default to false."),
    },
  };
};

const pickCompany = (input: Phase4LLMInput, text: string) =>
  input.allowedCompanies.find((company) => company.companyId === priorityCompanyId(text)) ??
  input.allowedCompanies.find((company) =>
    [...company.serviceKeywords.en, ...company.serviceKeywords.fi].some((keyword) =>
      text.includes(keyword.toLowerCase()),
    ),
  ) ?? null;

const priorityCompanyId = (text: string) => {
  if (text.includes("paint") || text.includes("painting") || text.includes("wall scratch") || text.includes("maalaus")) {
    return "company_maalausmestarit";
  }
  if (text.includes("sealant") || text.includes("sauma")) {
    return "company_sealpro";
  }
  if (text.includes("electrical") || text.includes("sähkö")) {
    return "company_north_electric";
  }
  if (text.includes("palokatko") || text.includes("fire stop")) {
    return "company_palostop";
  }
  return null;
};

const pickArea = (input: Phase4LLMInput, text: string) =>
  input.formSchema.allowedAreaOptions.find((area) =>
    text.includes(area.toLowerCase()),
  ) ?? null;

const field = (
  value: unknown,
  status: string,
  confidence: string,
  evidence: string | null,
  reason: string,
) => ({ value, status, confidence, evidence, reason });
