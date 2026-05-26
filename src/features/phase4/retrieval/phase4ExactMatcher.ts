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
      const alias = item.exactAliases.find((candidate) => {
        const normalizedAlias = normalizePhase4RetrievalText(candidate);
        return normalizedAlias.length >= 2 && normalizedTranscript.includes(normalizedAlias);
      });
      return alias
        ? [{
            item,
            score: exactScore(item.itemType),
            matchType: "exact" as const,
            evidence: alias,
          }]
        : [];
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, input.limit ?? 20);
};

const exactScore = (itemType: Phase4RetrievalItem["itemType"]) => {
  if (itemType === "area") {
    return 100;
  }
  if (itemType === "company_context") {
    return 90;
  }
  return 70;
};
