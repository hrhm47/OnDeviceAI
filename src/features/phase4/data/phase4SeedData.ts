import seedBundleJson from "./seed/phase4SeedBundle.v1.json";

export const PHASE4_DEFAULT_USER_ID = "u_timmo";

export type Phase4SeedProject = {
  project_id: string;
  project_name: string;
  city_area?: string | null;
  project_type?: string | null;
  project_status?: string | null;
  active_phase?: string | null;
  building_count?: number | null;
  default_form_id?: string | null;
  project_context_note?: string | null;
};

export type Phase4SeedCompany = {
  company_id: string;
  company_name: string;
  company_type?: string | null;
  primary_trade_group?: string | null;
  multi_trade_capable?: boolean | null;
  company_size_band?: string | null;
  home_region?: string | null;
  company_note?: string | null;
};

export type Phase4SeedUser = {
  user_id: string;
  display_name: string;
  role_type?: string | null;
  employer_company_id?: string | null;
  trade_category?: string | null;
  active_project_id: string;
  default_area_id?: string | null;
  default_language?: string | null;
  can_report_any_issue?: boolean | null;
  can_confirm_company?: boolean | null;
  persona_note?: string | null;
};

export type Phase4SeedArea = {
  area_id: string;
  project_id: string;
  building_name?: string | null;
  building_phase?: string | null;
  floor_or_zone?: string | number | null;
  area_type?: string | null;
  area_label: string;
  spoken_location_examples?: string[];
  parent_area_id?: string | null;
  area_note?: string | null;
};

export type Phase4SeedProjectCompanyContext = {
  context_id: string;
  project_id: string;
  company_id: string;
  work_type_code: string;
  project_role?: string | null;
  agreement_scope?: string | null;
  building_scope?: string | null;
  floor_or_zone_scope?: string | number | null;
  phase_scope?: string | null;
  scope_unit_type?: string | null;
  scope_unit_count?: number | null;
  estimated_crew_size?: number | null;
  capacity_band?: string | null;
  assigned_note_count?: number | null;
  similar_issue_note_count?: number | null;
  note_count_interpretation?: string | null;
  candidate_match_note?: string | null;
  trigger_keywords_en_fi?: string | null;
};

export type Phase4SeedBundle = {
  projects: Phase4SeedProject[];
  companies: Phase4SeedCompany[];
  users: Phase4SeedUser[];
  areas: Phase4SeedArea[];
  projectCompanyContext: Phase4SeedProjectCompanyContext[];
};

export type Phase4SeedValidationResult = {
  valid: boolean;
  counts: Record<keyof Phase4SeedBundle, number>;
  errors: string[];
  warnings: string[];
};

export const getPhase4SeedBundle = (): Phase4SeedBundle =>
  seedBundleJson as Phase4SeedBundle;

export const validatePhase4SeedBundle = (
  bundle: Phase4SeedBundle = getPhase4SeedBundle(),
): Phase4SeedValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const projectIds = uniqueIds(bundle.projects, "project_id", errors);
  const companyIds = uniqueIds(bundle.companies, "company_id", errors);
  const userIds = uniqueIds(bundle.users, "user_id", errors);
  const areaIds = uniqueIds(bundle.areas, "area_id", errors);
  uniqueIds(bundle.projectCompanyContext, "context_id", errors);

  for (const user of bundle.users) {
    if (!projectIds.has(user.active_project_id)) {
      errors.push(`User ${user.user_id} has unknown active_project_id ${user.active_project_id}.`);
    }
    if (user.employer_company_id && !companyIds.has(user.employer_company_id)) {
      errors.push(`User ${user.user_id} has unknown employer_company_id ${user.employer_company_id}.`);
    }
    const defaultArea = bundle.areas.find((area) => area.area_id === user.default_area_id);
    if (user.default_area_id && !defaultArea) {
      errors.push(`User ${user.user_id} has unknown default_area_id ${user.default_area_id}.`);
    } else if (defaultArea && defaultArea.project_id !== user.active_project_id) {
      warnings.push(`User ${user.user_id} default area is outside the active project.`);
    }
  }

  for (const area of bundle.areas) {
    if (!projectIds.has(area.project_id)) {
      errors.push(`Area ${area.area_id} has unknown project_id ${area.project_id}.`);
    }
    if (area.parent_area_id && !areaIds.has(area.parent_area_id)) {
      errors.push(`Area ${area.area_id} has unknown parent_area_id ${area.parent_area_id}.`);
    }
  }

  for (const context of bundle.projectCompanyContext) {
    if (!projectIds.has(context.project_id)) {
      errors.push(`Context ${context.context_id} has unknown project_id ${context.project_id}.`);
    }
    if (!companyIds.has(context.company_id)) {
      errors.push(`Context ${context.context_id} has unknown company_id ${context.company_id}.`);
    }
  }

  if (!userIds.has(PHASE4_DEFAULT_USER_ID)) {
    warnings.push(`Default Phase 4 user ${PHASE4_DEFAULT_USER_ID} was not found.`);
  }

  return {
    valid: errors.length === 0,
    counts: {
      projects: bundle.projects.length,
      companies: bundle.companies.length,
      users: bundle.users.length,
      areas: bundle.areas.length,
      projectCompanyContext: bundle.projectCompanyContext.length,
    },
    errors,
    warnings,
  };
};

const uniqueIds = <T extends Record<K, string>, K extends keyof T>(
  items: T[],
  key: K,
  errors: string[],
) => {
  const ids = new Set<string>();
  for (const item of items) {
    const value = item[key];
    if (ids.has(value)) {
      errors.push(`Duplicate ${String(key)} ${value}.`);
    }
    ids.add(value);
  }
  return ids;
};
