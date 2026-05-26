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
