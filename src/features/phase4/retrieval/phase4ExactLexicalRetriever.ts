import type { SQLiteDatabase } from "expo-sqlite";

import { findExactPhase4RetrievalHits } from "./phase4ExactMatcher";
import { searchPhase4LexicalRetrievalItems } from "./phase4LexicalRetriever";
import {
  getAllPhase4RetrievalItems,
} from "./phase4RetrievalItemRepository";
import type { Phase4RetrievalHit, Phase4RetrievalItem } from "./phase4RetrievalTypes";

export const retrievePhase4ExactLexicalHits = async (input: {
  db: SQLiteDatabase;
  projectId: string;
  transcript: string;
  items?: Phase4RetrievalItem[];
  limit?: number;
}): Promise<Phase4RetrievalHit[]> => {
  const items = input.items ?? (await getAllPhase4RetrievalItems(input.db));
  const exactHits = findExactPhase4RetrievalHits({
    transcript: input.transcript,
    projectId: input.projectId,
    items,
    limit: input.limit,
  });
  const lexicalHits = await searchPhase4LexicalRetrievalItems(input);
  const seen = new Set<string>();

  return [...exactHits, ...lexicalHits]
    .filter((hit) => {
      const key = `${hit.matchType}:${hit.item.itemId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, input.limit ?? 20);
};
