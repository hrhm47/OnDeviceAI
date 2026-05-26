import type { Phase4RetrievalHit, Phase4RetrievalItem } from "./phase4RetrievalTypes";
import { normalizePhase4RetrievalText } from "./phase4TranscriptNormalizer";

export const findExactPhase4RetrievalHits = (input: {
  transcript: string;
  projectId: string;
  items: Phase4RetrievalItem[];
  limit?: number;
}): Phase4RetrievalHit[] => {
  const normalizedTranscript = normalizePhase4RetrievalText(input.transcript);
  return input.items
    .filter((item) => item.projectId === input.projectId)
    .flatMap((item) => {
      const match = aliasMatches(item)
        .filter((candidate) => {
          const normalizedAlias = normalizePhase4RetrievalText(candidate.alias);
          return (
            normalizedAlias.length >= 2 &&
            normalizedTranscript.includes(normalizedAlias)
          );
        })
        .sort((first, second) => second.score - first.score)[0];
      return match
        ? [{
            item,
            score: exactScore(item, match.score),
            matchType: "exact" as const,
            evidence: match.alias,
          }]
        : [];
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, input.limit ?? 20);
};

const aliasMatches = (item: Phase4RetrievalItem) => {
  if (item.itemType !== "area") {
    return item.exactAliases.map((alias) => ({ alias, score: 0 }));
  }

  const strongAliases = stringArray(item.metadata.strongAliases);
  const weakAliases = stringArray(item.metadata.weakAliases);
  return [
    ...strongAliases.map((alias) => ({ alias, score: 30 + alias.length / 4 })),
    ...weakAliases.map((alias) => ({ alias, score: -35 + alias.length / 6 })),
  ];
};

const exactScore = (item: Phase4RetrievalItem, aliasScore: number) => {
  if (item.itemType === "area") {
    return 70 + aliasScore + numberValue(item.metadata.specificity);
  }
  if (item.itemType === "company_context") {
    return 90;
  }
  return 70;
};

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
