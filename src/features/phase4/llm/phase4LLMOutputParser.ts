type RawField = {
  value?: unknown;
  status?: unknown;
  confidence?: unknown;
  evidence?: unknown;
  reason?: unknown;
  companyId?: unknown;
};

export type Phase4RawLLMOutput = {
  formId: "general_task_form";
  schemaVersion?: unknown;
  fields: Record<string, RawField>;
  reviewSuggestions?: Record<string, unknown>;
};

export type Phase4ParseResult = {
  success: boolean;
  output: Phase4RawLLMOutput | null;
  normalizedText: string;
  errorMessage: string | null;
};

export const parsePhase4LLMOutput = (rawText: string): Phase4ParseResult => {
  const normalizedText = stripCodeFence(rawText.trim());

  try {
    const parsed: unknown = JSON.parse(normalizedText);
    if (!isRecord(parsed)) {
      return fail(normalizedText, "LLM output was not a JSON object.");
    }
    if (parsed.formId !== "general_task_form") {
      return fail(normalizedText, "LLM output formId was not general_task_form.");
    }
    if (!isRecord(parsed.fields)) {
      return fail(normalizedText, "LLM output fields object was missing.");
    }

    return {
      success: true,
      output: parsed as Phase4RawLLMOutput,
      normalizedText,
      errorMessage: null,
    };
  } catch (error) {
    return fail(
      normalizedText,
      error instanceof Error ? error.message : "Failed to parse LLM JSON.",
    );
  }
};

const stripCodeFence = (text: string) => {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? text;
};

const fail = (normalizedText: string, errorMessage: string): Phase4ParseResult => ({
  success: false,
  output: null,
  normalizedText,
  errorMessage,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
