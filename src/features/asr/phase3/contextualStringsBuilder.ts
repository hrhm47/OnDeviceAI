import type { ProjectSpeechContext } from "./projectSpeechContext";

const DEFAULT_MAX_ITEMS = 100;
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

  const values = [
    ...(includeEnglish ? context.locations : []),
    ...(includeEnglish ? context.rooms : []),
    ...(includeEnglish ? context.issueTypes : []),
    ...(includeEnglish ? context.categories : []),
    ...(includeEnglish ? context.contractorRoles : []),
    ...(includeEnglish ? context.contractorNames : []),
    ...(includeEnglish ? context.urgencyWords : []),
    ...(includeFinnish ? context.finnishTerms : []),
  ];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    const key = trimmed.toLocaleLowerCase();
    if (!trimmed || trimmed.length > MAX_PHRASE_LENGTH || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}
