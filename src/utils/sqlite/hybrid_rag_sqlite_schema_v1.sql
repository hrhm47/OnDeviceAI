-- Project-scoped Hybrid RAG SQLite schema v1
-- Core idea: relational project context + retrieval_items + FTS5 + optional embedding vectors.

CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  city_area TEXT,
  project_type TEXT,
  project_status TEXT,
  primary_phase TEXT,
  default_form_id TEXT
);

CREATE TABLE IF NOT EXISTS companies (
  company_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_type TEXT,
  primary_trade_group TEXT,
  multi_trade_capable INTEGER DEFAULT 0,
  company_size_band TEXT,
  home_region TEXT
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role_type TEXT,
  employer_company_id TEXT,
  trade_category TEXT,
  active_project_id TEXT NOT NULL,
  default_area_id TEXT,
  default_language TEXT DEFAULT 'en',
  can_report_any_issue INTEGER DEFAULT 1,
  can_confirm_company INTEGER DEFAULT 0,
  FOREIGN KEY (active_project_id) REFERENCES projects(project_id),
  FOREIGN KEY (employer_company_id) REFERENCES companies(company_id)
);

CREATE TABLE IF NOT EXISTS areas (
  area_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  building_name TEXT,
  building_phase TEXT,
  floor_or_zone TEXT,
  area_type TEXT,
  area_label TEXT NOT NULL,
  spoken_location_examples TEXT,
  parent_area_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE TABLE IF NOT EXISTS project_company_context (
  context_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  work_type_code TEXT NOT NULL,
  role_in_project TEXT,
  agreement_scope TEXT,
  building_scope TEXT,
  floor_scope TEXT,
  phase_scope TEXT,
  scope_unit_type TEXT,
  scope_unit_count INTEGER,
  estimated_crew_size INTEGER,
  capacity_band TEXT,
  assigned_note_count INTEGER DEFAULT 0,
  similar_issue_note_count INTEGER DEFAULT 0,
  note_count_meaning TEXT,
  keyword_phrases_en TEXT,
  keyword_phrases_fi TEXT,
  resolver_hint TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE TABLE IF NOT EXISTS retrieval_items (
  item_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_type TEXT NOT NULL, -- area | company_context | work_type | action | tag | date_hint
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  exact_aliases_json TEXT, -- JSON string array
  search_text TEXT NOT NULL,
  metadata_json TEXT, -- JSON object
  embedding_dim INTEGER,
  embedding_vector_json TEXT, -- JSON float array; switch to sqlite-vec/blob later if needed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- FTS5 index for lexical / sparse retrieval.
CREATE VIRTUAL TABLE IF NOT EXISTS retrieval_items_fts USING fts5(
  item_id UNINDEXED,
  project_id UNINDEXED,
  item_type UNINDEXED,
  display_name,
  exact_aliases,
  search_text,
  content=''
);

CREATE INDEX IF NOT EXISTS idx_retrieval_items_project ON retrieval_items(project_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_items_type ON retrieval_items(project_id, item_type);
CREATE INDEX IF NOT EXISTS idx_pcc_project_work_type ON project_company_context(project_id, work_type_code);
CREATE INDEX IF NOT EXISTS idx_areas_project ON areas(project_id);
