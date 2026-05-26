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
    .slice(0, 12)
    .map((token) => `"${token.replace(/"/g, "\"\"")}"`)
    .join(" OR ");
