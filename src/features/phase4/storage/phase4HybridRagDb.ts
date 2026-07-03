import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { HYBRID_RAG_SQLITE_SCHEMA_V2 } from "@/src/utils/sqlite/coreSqliteSchema";
import { RETRIEVAL_SQLITE_SCHEMA_V2 } from "@/src/utils/sqlite/retrievalSqliteSchema";
import {
  getPhase4SeedBundle,
  PHASE4_DATASET_VERSION,
  type Phase4SeedBuildingLevel,
  type Phase4SeedBundle,
  type Phase4SeedFloor,
} from "../data/phase4SeedData";

export const PHASE4_HYBRID_RAG_DB_NAME = "phase4_hybrid_rag_v2_1.db";

export const openPhase4HybridRagDatabase = () =>
  openDatabaseAsync(PHASE4_HYBRID_RAG_DB_NAME);

export const initializePhase4HybridRagDatabase = async (
  db?: SQLiteDatabase,
): Promise<SQLiteDatabase> => {
  const database = db ?? (await openPhase4HybridRagDatabase());
  await database.execAsync("PRAGMA foreign_keys = ON;");
  await database.execAsync(HYBRID_RAG_SQLITE_SCHEMA_V2);
  await database.execAsync(RETRIEVAL_SQLITE_SCHEMA_V2);
  return database;
};

export const checkPhase4Fts5Support = async (db: SQLiteDatabase) => {
  try {
    await db.execAsync("CREATE VIRTUAL TABLE IF NOT EXISTS phase4_fts_probe USING fts5(value);");
    await db.execAsync("DROP TABLE IF EXISTS phase4_fts_probe;");
    return { supported: true, message: "SQLite FTS5 is available." };
  } catch (error) {
    return {
      supported: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

export const importPhase4SeedBundle = async (
  db: SQLiteDatabase,
  bundle: Phase4SeedBundle = getPhase4SeedBundle(),
) => {
  await db.withTransactionAsync(async () => {
    await clearPhase4SeedTables(db);
    await importDatasetMeta(db, bundle);
    await importProjects(db, bundle);
    await importSites(db, bundle);
    await importBuildings(db, bundle);
    await importWorkTypes(db, bundle);
    await importCompanies(db, bundle);
    await importUsers(db, bundle);
    await importProjectCompanyContexts(db, bundle);
  });
};

export const getPhase4SeedTableCounts = async (db: SQLiteDatabase) => ({
  datasetMeta: await tableCount(db, "dataset_meta"),
  projects: await tableCount(db, "projects"),
  sites: await tableCount(db, "sites"),
  buildings: await tableCount(db, "buildings"),
  buildingLevels: await tableCount(db, "building_levels"),
  apartments: await tableCount(db, "apartments"),
  spaces: await tableCount(db, "spaces"),
  workTypes: await tableCount(db, "work_types"),
  workTypeAliases: await tableCount(db, "work_type_aliases"),
  companies: await tableCount(db, "companies"),
  companyWorkTypes: await tableCount(db, "company_work_types"),
  users: await tableCount(db, "users"),
  projectCompanyContexts: await tableCount(db, "project_company_contexts"),
  contextWorkTypes: await tableCount(db, "context_work_types"),
  contextSites: await tableCount(db, "context_sites"),
  contextBuildings: await tableCount(db, "context_buildings"),
  contextFloors: await tableCount(db, "context_floors"),
  contextApartments: await tableCount(db, "context_apartments"),
  contextSpaceTypes: await tableCount(db, "context_space_types"),
});

const clearPhase4SeedTables = async (db: SQLiteDatabase) => {
  await db.execAsync(`
    DELETE FROM retrieval_items_fts;
    DELETE FROM retrieval_items;
    DELETE FROM context_space_types;
    DELETE FROM context_apartments;
    DELETE FROM context_floors;
    DELETE FROM context_buildings;
    DELETE FROM context_sites;
    DELETE FROM context_work_types;
    DELETE FROM project_company_contexts;
    DELETE FROM users;
    DELETE FROM company_work_types;
    DELETE FROM companies;
    DELETE FROM work_type_aliases;
    DELETE FROM spaces;
    DELETE FROM apartments;
    DELETE FROM building_levels;
    DELETE FROM buildings;
    DELETE FROM sites;
    DELETE FROM work_types;
    DELETE FROM projects;
    DELETE FROM dataset_meta;
  `);
};

const importDatasetMeta = async (
  db: SQLiteDatabase,
  bundle: Phase4SeedBundle,
) => {
  await db.runAsync(
    "INSERT INTO dataset_meta (key, value) VALUES (?, ?)",
    "dataset_version",
    bundle.dataset_version ?? PHASE4_DATASET_VERSION,
  );
};

const importProjects = async (
  db: SQLiteDatabase,
  bundle: Phase4SeedBundle,
) => {
  for (const project of bundle.projects) {
    await db.runAsync(
      `INSERT INTO projects
        (project_id, project_name, project_type, project_status, default_form_id, dataset_language, project_description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      project.project_id,
      project.project_name,
      project.project_type,
      project.project_status,
      project.default_form_id,
      project.dataset_language,
      project.project_description,
    );
  }
};

const importSites = async (db: SQLiteDatabase, bundle: Phase4SeedBundle) => {
  for (const site of bundle.sites) {
    await db.runAsync(
      `INSERT INTO sites
        (site_id, project_id, site_name, address_line, city_district, city, country, building_ids, site_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      site.site_id,
      site.project_id,
      site.site_name,
      site.address_line ?? null,
      site.city_district ?? null,
      site.city ?? null,
      site.country ?? null,
      site.building_ids ? JSON.stringify(site.building_ids) : null,
      site.site_description ?? null,
    );
  }
};

const importBuildings = async (
  db: SQLiteDatabase,
  bundle: Phase4SeedBundle,
) => {
  for (const building of bundle.buildings) {
    await db.runAsync(
      `INSERT INTO buildings
        (building_id, site_id, project_id, building_name, building_code, building_type, address_line, above_ground_floor_count, has_basement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      building.building_id,
      building.site_id,
      building.project_id,
      building.building_name,
      building.building_code,
      building.building_type,
      building.address_line,
      building.above_ground_floor_count,
      building.has_basement ? 1 : 0,
    );

    if (building.basement) {
      await importBuildingLevel(db, building.building_id, "basement", building.basement);
      await importSharedSpaces(db, building.building_id, building.basement);
    }

    for (const floor of building.floors) {
      await importBuildingLevel(db, building.building_id, "floor", floor);
      await importSharedSpaces(db, building.building_id, floor);
      await importApartments(db, building.building_id, floor);
    }
  }
};

const importBuildingLevel = async (
  db: SQLiteDatabase,
  buildingId: string,
  levelKind: "floor" | "basement",
  level: Phase4SeedBuildingLevel,
) => {
  await db.runAsync(
    `INSERT INTO building_levels
      (level_id, building_id, level_kind, floor_number, level_label)
     VALUES (?, ?, ?, ?, ?)`,
    level.floor_id,
    buildingId,
    levelKind,
    level.floor_number,
    level.floor_label,
  );
};

const importSharedSpaces = async (
  db: SQLiteDatabase,
  buildingId: string,
  level: Phase4SeedBuildingLevel,
) => {
  for (const space of level.shared_spaces) {
    await db.runAsync(
      `INSERT INTO spaces
        (space_id, building_id, level_id, apartment_id, location_kind, space_type, space_number, display_name, sequence_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      space.space_id,
      buildingId,
      level.floor_id,
      null,
      "shared",
      space.space_type,
      null,
      space.display_name,
      null,
    );
  }
};

const importApartments = async (
  db: SQLiteDatabase,
  buildingId: string,
  floor: Phase4SeedFloor,
) => {
  for (const apartment of floor.apartments) {
    await db.runAsync(
      `INSERT INTO apartments
        (apartment_id, building_id, level_id, apartment_number, floor_number, sequence_on_floor, layout_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      apartment.apartment_id,
      buildingId,
      floor.floor_id,
      apartment.apartment_number,
      apartment.floor_number,
      apartment.sequence_on_floor,
      apartment.layout_type,
    );

    for (const space of apartment.spaces) {
      await db.runAsync(
        `INSERT INTO spaces
          (space_id, building_id, level_id, apartment_id, location_kind, space_type, space_number, display_name, sequence_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        space.space_id,
        buildingId,
        floor.floor_id,
        apartment.apartment_id,
        "apartment",
        space.space_type,
        space.space_number,
        space.display_name,
        space.sequence,
      );
    }
  }
};

const importWorkTypes = async (
  db: SQLiteDatabase,
  bundle: Phase4SeedBundle,
) => {
  for (const workType of bundle.workTypes) {
    await db.runAsync(
      `INSERT INTO work_types
        (work_type_id, name, description)
       VALUES (?, ?, ?)`,
      workType.work_type_id,
      workType.name,
      workType.description ?? null,
    );

    for (const alias of workType.aliases_en ?? []) {
      await insertWorkTypeAlias(db, workType.work_type_id, alias, "alias");
    }
    for (const example of workType.example_issues_en ?? []) {
      await insertWorkTypeAlias(db, workType.work_type_id, example, "example_issue");
    }
  }
};

const insertWorkTypeAlias = async (
  db: SQLiteDatabase,
  workTypeId: string,
  text: string,
  kind: "alias" | "example_issue",
) => {
  await db.runAsync(
    `INSERT INTO work_type_aliases
      (work_type_id, alias_text, normalized_alias, alias_kind)
     VALUES (?, ?, ?, ?)`,
    workTypeId,
    text,
    normalizeText(text),
    kind,
  );
};

const importCompanies = async (
  db: SQLiteDatabase,
  bundle: Phase4SeedBundle,
) => {
  for (const company of bundle.companies) {
    await db.runAsync(
      `INSERT INTO companies
        (company_id, company_name, company_type, home_city, company_status, company_description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      company.company_id,
      company.company_name,
      company.company_type ?? null,
      company.home_city ?? null,
      company.company_status ?? null,
      company.company_description ?? null,
    );

    for (const workTypeId of company.general_capability_work_type_ids ?? []) {
      await db.runAsync(
        `INSERT INTO company_work_types
          (company_id, work_type_id)
         VALUES (?, ?)`,
        company.company_id,
        workTypeId,
      );
    }
  }
};

const importUsers = async (db: SQLiteDatabase, bundle: Phase4SeedBundle) => {
  for (const user of bundle.users) {
    await db.runAsync(
      `INSERT INTO users
        (user_id, display_name, role_type, employer_company_id, active_project_id, default_building_id, default_floor_number, default_language, user_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      user.user_id,
      user.display_name,
      user.role_type ?? null,
      user.employer_company_id ?? null,
      user.active_project_id,
      user.default_building_id ?? null,
      user.default_floor_number ?? null,
      user.default_language ?? null,
      user.user_description ?? null,
    );
  }
};

const importProjectCompanyContexts = async (
  db: SQLiteDatabase,
  bundle: Phase4SeedBundle,
) => {
  for (const context of bundle.projectCompanyContext) {
    await db.runAsync(
      `INSERT INTO project_company_contexts
        (context_id, project_id, company_id, project_role, responsibility_description, level_scope_type, includes_basement, apartment_scope_type, space_type_scope_type, agreement_start_date, agreement_end_date, status, scope_notes, level_scope_description, apartment_scope_description, space_type_scope_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      context.context_id,
      context.project_id,
      context.company_id,
      context.project_role,
      context.responsibility_description,
      context.level_scope.scope_type,
      context.level_scope.includes_basement ? 1 : 0,
      context.apartment_scope.scope_type,
      context.space_type_scope.scope_type,
      context.agreement_start_date,
      context.agreement_end_date,
      context.status,
      context.scope_notes,
      context.level_scope.scope_description,
      context.apartment_scope.scope_description,
      context.space_type_scope.scope_description,
    );

    await insertContextValues(db, "context_work_types", "work_type_id", context.context_id, context.work_type_ids ?? []);
    await insertContextValues(db, "context_sites", "site_id", context.context_id, context.site_ids ?? []);
    await insertContextValues(db, "context_buildings", "building_id", context.context_id, context.building_ids ?? []);
    await insertContextNumbers(db, "context_floors", "floor_number", context.context_id, context.level_scope.floor_numbers);
    await insertContextValues(db, "context_apartments", "apartment_id", context.context_id, context.apartment_scope.apartment_ids);
    await insertContextValues(db, "context_space_types", "space_type", context.context_id, context.space_type_scope.space_types);
  }
};

const insertContextValues = async (
  db: SQLiteDatabase,
  tableName: string,
  valueColumn: string,
  contextId: string,
  values: string[],
) => {
  for (const value of values) {
    await db.runAsync(
      `INSERT INTO ${tableName} (context_id, ${valueColumn}) VALUES (?, ?)`,
      contextId,
      value,
    );
  }
};

const insertContextNumbers = async (
  db: SQLiteDatabase,
  tableName: string,
  valueColumn: string,
  contextId: string,
  values: number[],
) => {
  for (const value of values) {
    await db.runAsync(
      `INSERT INTO ${tableName} (context_id, ${valueColumn}) VALUES (?, ?)`,
      contextId,
      value,
    );
  }
};

const tableCount = async (db: SQLiteDatabase, tableName: string) => {
  const rows = await db.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${tableName}`,
  );
  return rows[0]?.count ?? 0;
};

const normalizeText = (value: string) => value.trim().toLowerCase();
