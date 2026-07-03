export const RETRIEVAL_SQLITE_SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS retrieval_items (
  item_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  exact_aliases_json TEXT,
  search_text TEXT NOT NULL,
  metadata_json TEXT,
  embedding_dim INTEGER,
  embedding_vector_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id)
    REFERENCES projects(project_id)
    ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS retrieval_items_fts USING fts5(
  item_id UNINDEXED,
  project_id UNINDEXED,
  item_type UNINDEXED,
  display_name,
  exact_aliases,
  search_text
);

CREATE INDEX IF NOT EXISTS idx_retrieval_items_project ON retrieval_items(project_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_items_type ON retrieval_items(project_id, item_type);

`;
