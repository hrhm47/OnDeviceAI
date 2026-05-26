import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import {
  getPhase4SeedBundle,
  type Phase4SeedBundle,
} from "../data/phase4SeedData";
import { HYBRID_RAG_SQLITE_SCHEMA_V1 } from "@/src/utils/sqlite/hybridRagSqliteSchema";

export const PHASE4_HYBRID_RAG_DB_NAME = "phase4_hybrid_rag.db";

export const openPhase4HybridRagDatabase = () =>
  openDatabaseAsync(PHASE4_HYBRID_RAG_DB_NAME);

export const initializePhase4HybridRagDatabase = async (
  db?: SQLiteDatabase,
): Promise<SQLiteDatabase> => {
  const database = db ?? (await openPhase4HybridRagDatabase());
  await database.execAsync("PRAGMA foreign_keys = ON;");
  await database.execAsync(HYBRID_RAG_SQLITE_SCHEMA_V1);
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
  for (const project of bundle.projects) {
    await db.runAsync(
      `INSERT OR REPLACE INTO projects
        (project_id, project_name, city_area, project_type, project_status, primary_phase, default_form_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      project.project_id,
      project.project_name,
      project.city_area ?? null,
      project.project_type ?? null,
      project.project_status ?? null,
      project.active_phase ?? null,
      project.default_form_id ?? null,
    );
  }

  for (const company of bundle.companies) {
    await db.runAsync(
      `INSERT OR REPLACE INTO companies
        (company_id, company_name, company_type, primary_trade_group, multi_trade_capable, company_size_band, home_region)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      company.company_id,
      company.company_name,
      company.company_type ?? null,
      company.primary_trade_group ?? null,
      company.multi_trade_capable ? 1 : 0,
      company.company_size_band ?? null,
      company.home_region ?? null,
    );
  }

  for (const user of bundle.users) {
    await db.runAsync(
      `INSERT OR REPLACE INTO users
        (user_id, display_name, role_type, employer_company_id, trade_category, active_project_id, default_area_id, default_language, can_report_any_issue, can_confirm_company)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      user.user_id,
      user.display_name,
      user.role_type ?? null,
      user.employer_company_id ?? null,
      user.trade_category ?? null,
      user.active_project_id,
      user.default_area_id ?? null,
      user.default_language ?? "en",
      user.can_report_any_issue ? 1 : 0,
      user.can_confirm_company ? 1 : 0,
    );
  }

  for (const area of bundle.areas) {
    await db.runAsync(
      `INSERT OR REPLACE INTO areas
        (area_id, project_id, building_name, building_phase, floor_or_zone, area_type, area_label, spoken_location_examples, parent_area_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      area.area_id,
      area.project_id,
      area.building_name ?? null,
      area.building_phase ?? null,
      area.floor_or_zone == null ? null : String(area.floor_or_zone),
      area.area_type ?? null,
      area.area_label,
      JSON.stringify(area.spoken_location_examples ?? []),
      area.parent_area_id ?? null,
    );
  }

  for (const context of bundle.projectCompanyContext) {
    await db.runAsync(
      `INSERT OR REPLACE INTO project_company_context
        (context_id, project_id, company_id, work_type_code, role_in_project, agreement_scope, building_scope, floor_scope, phase_scope, scope_unit_type, scope_unit_count, estimated_crew_size, capacity_band, assigned_note_count, similar_issue_note_count, note_count_meaning, keyword_phrases_en, keyword_phrases_fi, resolver_hint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      context.context_id,
      context.project_id,
      context.company_id,
      context.work_type_code,
      context.project_role ?? null,
      context.agreement_scope ?? null,
      context.building_scope ?? null,
      context.floor_or_zone_scope == null ? null : String(context.floor_or_zone_scope),
      context.phase_scope ?? null,
      context.scope_unit_type ?? null,
      context.scope_unit_count ?? null,
      context.estimated_crew_size ?? null,
      context.capacity_band ?? null,
      context.assigned_note_count ?? 0,
      context.similar_issue_note_count ?? 0,
      context.note_count_interpretation ?? null,
      context.trigger_keywords_en_fi ?? null,
      context.trigger_keywords_en_fi ?? null,
      context.candidate_match_note ?? null,
    );
  }
};

export const getPhase4SeedTableCounts = async (db: SQLiteDatabase) => ({
  projects: await tableCount(db, "projects"),
  companies: await tableCount(db, "companies"),
  users: await tableCount(db, "users"),
  areas: await tableCount(db, "areas"),
  projectCompanyContext: await tableCount(db, "project_company_context"),
});

const tableCount = async (db: SQLiteDatabase, tableName: string) => {
  const rows = await db.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${tableName}`,
  );
  return rows[0]?.count ?? 0;
};
