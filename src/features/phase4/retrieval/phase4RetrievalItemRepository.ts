import type { SQLiteDatabase } from "expo-sqlite";

import type { Phase4RetrievalItem } from "./phase4RetrievalTypes";

export const upsertPhase4RetrievalItems = async (
  db: SQLiteDatabase,
  items: Phase4RetrievalItem[],
) => {
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO retrieval_items
        (item_id, project_id, item_type, source_table, source_id, display_name, exact_aliases_json, search_text, metadata_json, embedding_dim, embedding_vector_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.itemId,
      item.projectId,
      item.itemType,
      item.sourceTable,
      item.sourceId,
      item.displayName,
      JSON.stringify(item.exactAliases),
      item.searchText,
      JSON.stringify(item.metadata),
      item.embeddingVector?.length ?? null,
      item.embeddingVector ? JSON.stringify(item.embeddingVector) : null,
    );
  }
};

export const getPhase4RetrievalItemCount = async (
  db: SQLiteDatabase,
  projectId: string,
) => {
  const rows = await db.getAllAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM retrieval_items WHERE project_id = ?",
    projectId,
  );
  return rows[0]?.count ?? 0;
};

export const rebuildPhase4RetrievalItemsFts = async (db: SQLiteDatabase) => {
  await db.runAsync("INSERT INTO retrieval_items_fts(retrieval_items_fts) VALUES('delete-all')");
  const items = await getAllPhase4RetrievalItems(db);
  for (const item of items) {
    await db.runAsync(
      `INSERT INTO retrieval_items_fts
        (item_id, project_id, item_type, display_name, exact_aliases, search_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      item.itemId,
      item.projectId,
      item.itemType,
      item.displayName,
      item.exactAliases.join(" "),
      item.searchText,
    );
  }
};

export const getAllPhase4RetrievalItems = async (db: SQLiteDatabase) => {
  const rows = await db.getAllAsync<RetrievalItemRow>(
    "SELECT * FROM retrieval_items",
  );
  return rows.map(rowToRetrievalItem);
};

export const getPhase4RetrievalItemsByIds = async (
  db: SQLiteDatabase,
  itemIds: string[],
) => {
  if (!itemIds.length) {
    return [];
  }
  const placeholders = itemIds.map(() => "?").join(", ");
  const rows = await db.getAllAsync<RetrievalItemRow>(
    `SELECT * FROM retrieval_items WHERE item_id IN (${placeholders})`,
    itemIds,
  );
  return rows.map(rowToRetrievalItem);
};

type RetrievalItemRow = {
  item_id: string;
  project_id: string;
  item_type: Phase4RetrievalItem["itemType"];
  source_table: string;
  source_id: string;
  display_name: string;
  exact_aliases_json: string | null;
  search_text: string;
  metadata_json: string | null;
  embedding_vector_json: string | null;
};

const rowToRetrievalItem = (row: RetrievalItemRow): Phase4RetrievalItem => ({
  itemId: row.item_id,
  projectId: row.project_id,
  itemType: row.item_type,
  sourceTable: row.source_table,
  sourceId: row.source_id,
  displayName: row.display_name,
  exactAliases: parseJson<string[]>(row.exact_aliases_json, []),
  searchText: row.search_text,
  metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
  embeddingVector: parseJson<number[] | undefined>(row.embedding_vector_json, undefined),
});

const parseJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};
