export const HYBRID_RAG_SQLITE_SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS dataset_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  project_status TEXT NOT NULL,
  default_form_id TEXT NOT NULL,
  dataset_language TEXT NOT NULL,
  project_description TEXT
);

CREATE TABLE IF NOT EXISTS sites (
  site_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  site_name TEXT NOT NULL,
  address_line TEXT,
  city_district TEXT,
  city TEXT,
  country TEXT,
  building_ids TEXT,
  site_description TEXT,

  FOREIGN KEY (project_id)
    REFERENCES projects(project_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buildings (
  building_id TEXT PRIMARY KEY NOT NULL,
  site_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  building_name TEXT NOT NULL,
  building_code TEXT,
  building_type TEXT,
  address_line TEXT,
  above_ground_floor_count INTEGER,
  has_basement INTEGER NOT NULL,

  FOREIGN KEY (site_id)
    REFERENCES sites(site_id)
    ON DELETE CASCADE,

  FOREIGN KEY (project_id)
    REFERENCES projects(project_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS building_levels (
  level_id TEXT PRIMARY KEY NOT NULL,
  building_id TEXT NOT NULL,
  level_kind TEXT NOT NULL
    CHECK (level_kind IN ('floor', 'basement')),
  floor_number INTEGER NOT NULL,
  level_label TEXT NOT NULL,

  FOREIGN KEY (building_id)
    REFERENCES buildings(building_id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS apartments (
  apartment_id TEXT PRIMARY KEY NOT NULL,
  building_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  apartment_number TEXT NOT NULL,
  floor_number INTEGER NOT NULL,
  sequence_on_floor INTEGER NOT NULL,
  layout_type TEXT NOT NULL,

  FOREIGN KEY (building_id)
    REFERENCES buildings(building_id)
    ON DELETE CASCADE,

  FOREIGN KEY (level_id)
    REFERENCES building_levels(level_id)
    ON DELETE CASCADE,

  UNIQUE (building_id, apartment_number)
);

CREATE TABLE IF NOT EXISTS spaces (
  space_id TEXT PRIMARY KEY NOT NULL,
  building_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  apartment_id TEXT,
  location_kind TEXT NOT NULL
    CHECK (location_kind IN ('apartment', 'shared')),
  space_type TEXT NOT NULL,
  space_number INTEGER,
  display_name TEXT NOT NULL,
  sequence_number INTEGER,

  FOREIGN KEY (building_id)
    REFERENCES buildings(building_id)
    ON DELETE CASCADE,

  FOREIGN KEY (level_id)
    REFERENCES building_levels(level_id)
    ON DELETE CASCADE,

  FOREIGN KEY (apartment_id)
    REFERENCES apartments(apartment_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_types (
  work_type_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS work_type_aliases (
  alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_type_id TEXT NOT NULL,
  alias_text TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  alias_kind TEXT NOT NULL
    CHECK (alias_kind IN ('alias', 'example_issue')),

  FOREIGN KEY (work_type_id)
    REFERENCES work_types(work_type_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
  idx_work_type_aliases_normalized
ON work_type_aliases(normalized_alias);


CREATE TABLE IF NOT EXISTS companies (
  company_id TEXT PRIMARY KEY NOT NULL,
  company_name TEXT NOT NULL,
  company_type TEXT,
  home_city TEXT,
  company_status TEXT,
  company_description TEXT
);

CREATE TABLE IF NOT EXISTS company_work_types (
  company_id TEXT NOT NULL,
  work_type_id TEXT NOT NULL,

  PRIMARY KEY (company_id, work_type_id),

  FOREIGN KEY (company_id)
    REFERENCES companies(company_id)
    ON DELETE CASCADE,

  FOREIGN KEY (work_type_id)
    REFERENCES work_types(work_type_id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  role_type TEXT,
  employer_company_id TEXT,
  active_project_id TEXT NOT NULL,
  default_building_id TEXT,
  default_floor_number INTEGER,
  default_language TEXT,
  user_description TEXT,

  FOREIGN KEY (employer_company_id)
    REFERENCES companies(company_id),

  FOREIGN KEY (active_project_id)
    REFERENCES projects(project_id),

  FOREIGN KEY (default_building_id)
    REFERENCES buildings(building_id)
);

CREATE TABLE IF NOT EXISTS project_company_contexts (
  context_id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  project_role TEXT,
  responsibility_description TEXT,

  level_scope_type TEXT NOT NULL,
  includes_basement INTEGER NOT NULL,

  apartment_scope_type TEXT NOT NULL,
  space_type_scope_type TEXT NOT NULL,

  agreement_start_date TEXT NOT NULL,
  agreement_end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  scope_notes TEXT,
  level_scope_description TEXT,
  apartment_scope_description TEXT,
  space_type_scope_description TEXT,

  FOREIGN KEY (project_id)
    REFERENCES projects(project_id)
    ON DELETE CASCADE,

  FOREIGN KEY (company_id)
    REFERENCES companies(company_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_work_types (
  context_id TEXT NOT NULL,
  work_type_id TEXT NOT NULL,

  PRIMARY KEY (context_id, work_type_id),

  FOREIGN KEY (context_id)
    REFERENCES project_company_contexts(context_id)
    ON DELETE CASCADE,

  FOREIGN KEY (work_type_id)
    REFERENCES work_types(work_type_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_sites (
  context_id TEXT NOT NULL,
  site_id TEXT NOT NULL,

  PRIMARY KEY (context_id, site_id),

  FOREIGN KEY (context_id)
    REFERENCES project_company_contexts(context_id)
    ON DELETE CASCADE,

  FOREIGN KEY (site_id)
    REFERENCES sites(site_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_buildings (
  context_id TEXT NOT NULL,
  building_id TEXT NOT NULL,

  PRIMARY KEY (context_id, building_id),

  FOREIGN KEY (context_id)
    REFERENCES project_company_contexts(context_id)
    ON DELETE CASCADE,

  FOREIGN KEY (building_id)
    REFERENCES buildings(building_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_floors (
  context_id TEXT NOT NULL,
  floor_number INTEGER NOT NULL,

  PRIMARY KEY (context_id, floor_number),

  FOREIGN KEY (context_id)
    REFERENCES project_company_contexts(context_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_apartments (
  context_id TEXT NOT NULL,
  apartment_id TEXT NOT NULL,

  PRIMARY KEY (context_id, apartment_id),

  FOREIGN KEY (context_id)
    REFERENCES project_company_contexts(context_id)
    ON DELETE CASCADE,

  FOREIGN KEY (apartment_id)
    REFERENCES apartments(apartment_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_space_types (
  context_id TEXT NOT NULL,
  space_type TEXT NOT NULL,

  PRIMARY KEY (context_id, space_type),

  FOREIGN KEY (context_id)
    REFERENCES project_company_contexts(context_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
  idx_context_work_types_work_type
ON context_work_types(work_type_id, context_id);

CREATE INDEX IF NOT EXISTS
  idx_context_buildings_building
ON context_buildings(building_id, context_id);

CREATE INDEX IF NOT EXISTS
  idx_context_floors_floor
ON context_floors(floor_number, context_id);

CREATE INDEX IF NOT EXISTS
  idx_context_space_types_space
ON context_space_types(space_type, context_id);

`;
