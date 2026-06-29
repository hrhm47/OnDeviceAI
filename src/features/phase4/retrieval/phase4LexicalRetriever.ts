import type { SQLiteDatabase } from "expo-sqlite";

import {
  getPhase4RetrievalItemsByIds,
} from "./phase4RetrievalItemRepository";
import type { Phase4RetrievalHit } from "./phase4RetrievalTypes";
import { tokenizePhase4RetrievalText } from "./phase4TranscriptNormalizer";

type FtsRow = {
  item_id: string;
  rank: number;
};

export const searchPhase4LexicalRetrievalItems = async (input: {
  db: SQLiteDatabase;
  projectId: string;
  transcript: string;
  limit?: number;
}): Promise<Phase4RetrievalHit[]> => {
  const query = toFtsQuery(input.transcript);
  if (!query) {
    return [];
  }

  const rows = await input.db.getAllAsync<FtsRow>(
    `SELECT item_id, bm25(retrieval_items_fts) as rank
     FROM retrieval_items_fts
     WHERE project_id = ? AND retrieval_items_fts MATCH ?
     ORDER BY rank
     LIMIT ?`,
    input.projectId,
    query,
    input.limit ?? 20,
  );
  const items = await getPhase4RetrievalItemsByIds(
    input.db,
    rows.map((row) => row.item_id),
  );
  const itemsById = new Map(items.map((item) => [item.itemId, item]));

  return rows.flatMap((row) => {
    const item = itemsById.get(row.item_id);
    return item
      ? [{
          item,
          score: Math.max(1, 50 - Math.abs(row.rank)),
          matchType: "lexical" as const,
          evidence: query,
        }]
      : [];
  });
};

const toFtsQuery = (value: string) =>
  Array.from(new Set(tokenizePhase4RetrievalText(value)))
    .filter((token) => !LEXICAL_STOPWORDS.has(token))
    .slice(0, 12)
    .map((token) => `"${token.replace(/"/g, "\"\"")}"`)
    .join(" OR ");

const LEXICAL_STOPWORDS = new Set([
 "i",
 "me",
 "my",
 "myself",
 "we",
 "our",
 "ours",
 "ourselves",
 "you",
 "your",
 "yours",
 "yourself",
 "yourselves",
 "he",
 "him",
 "his",
 "himself",
 "she",
 "her",
 "hers",
 "herself",
 "it",
 "its",
 "itself",
 "they",
 "them",
 "their",
 "theirs",
 "themselves",
 "what",
 "which",
 "who",
 "whom",
 "this",
 "that",
 "these",
 "those",
 "am",
 "is",
 "are",
 "was",
 "were",
 "be",
 "been",
 "being",
 "have",
 "has",
 "had",
 "having",
 "do",
 "does",
 "did",
 "doing",
 "a",
 "an",
 "the",
"and",
"but",
"if",
"or",
"because",
"as",
"until",
"while",
"of",
"at",
"by",
"for",
"with",
"about",
"against",
"between",
"into",
"through",
"during",
"before",
"after",
"above",
"below",
"to",
"from",
"up",
"down",
"in",
"out",
"on",
"off",
"over",
"under",
"again",
"further",
"then",
"once",
"here",
"there",
"when",
"where",
"why",
"how",
"all",
"any",
"both",
"each",
"few",
"more",
"most",
"other",
"some",
"such",
"no",
"nor",
"not",
"only",
"own",
"same",
"so",
"than",
"too",
"very",
"s",
"t",
"can",
"will",
"just",
"don",
"should",
"now", 
]);
