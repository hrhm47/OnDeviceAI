import {
  MAX_CONTEXTUAL_STRINGS_PER_LANGUAGE,
  MAX_CONTEXTUAL_STRINGS_TOTAL,
  type ProjectSpeechContext,
} from "./projectSpeechContext";

const DEFAULT_MAX_ITEMS = MAX_CONTEXTUAL_STRINGS_TOTAL;
const MAX_PHRASE_LENGTH = 64;

export function buildContextualStrings(
  context?: ProjectSpeechContext | null,
  options?: {
    maxItems?: number;
    includeEnglish?: boolean;
    includeFinnish?: boolean;
  },
): string[] {
  if (!context) {
    return [];
  }

  const maxItems = options?.maxItems ?? DEFAULT_MAX_ITEMS;
  const includeEnglish = options?.includeEnglish ?? true;
  const includeFinnish = options?.includeFinnish ?? true;

  const seen = new Set<string>();
  const result: string[] = [];

  if (includeEnglish) {
    appendValues(result, seen, englishValues(context), maxItems);
  }

  if (includeFinnish) {
    appendValues(result, seen, finnishValues(context), maxItems);
  }

  return result;
}

function englishValues(context: ProjectSpeechContext): readonly string[] {
  return (
    context.englishTerms ?? [
      ...(context.locations ?? []),
      ...(context.rooms ?? []),
      ...(context.issueTypes ?? []),
      ...(context.categories ?? []),
      ...(context.contractorRoles ?? []),
      ...(context.contractorNames ?? []),
      ...(context.urgencyWords ?? []),
    ]
  );
}

function finnishValues(context: ProjectSpeechContext): readonly string[] {
  return context.finnishTerms ?? [];
}

function appendValues(
  result: string[],
  seen: Set<string>,
  values: readonly string[],
  maxItems: number,
) {
  let addedForLanguage = 0;

  for (const value of values) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    const key = trimmed.toLocaleLowerCase();
    if (!trimmed || trimmed.length > MAX_PHRASE_LENGTH || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
    addedForLanguage += 1;

    if (
      result.length >= maxItems ||
      addedForLanguage >= MAX_CONTEXTUAL_STRINGS_PER_LANGUAGE
    ) {
      break;
    }
  }
}
