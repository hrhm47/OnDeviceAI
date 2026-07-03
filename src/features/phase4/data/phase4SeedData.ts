import seedBundleJson from "./alppila_building_dataset_v2/phase4SeedBundle.v2.1.json";

export const PHASE4_DATASET_VERSION = "2.1";
export const PHASE4_DEFAULT_USER_ID = "u_timmo";

export type Phase4SeedProject = {
  project_id: string;
  project_name: string;
  project_type: string;
  project_status: "active" | "inactive";
  default_form_id: string;
  dataset_language: string;
  project_description: string;
};

export type Phase4SeedCompany = {
  company_id: string;
  company_name: string;
  company_type: string | null;
  general_capability_work_type_ids?: string[] | null;
  home_city?: string | null;
  company_status?: string | null;
  company_description?: string | null;
};

export type Phase4SeedUser = {
  user_id: string;
  display_name: string;
  role_type?: string | null;
  employer_company_id?: string | null;
  active_project_id: string;
  default_building_id?: string | null;
  default_floor_number?: number | null;
  default_language?: string | null;
  user_description?: string | null;
};

export type Phase4SeedSharedSpace = {
  space_id: string;
  space_type: string;
  display_name: string;
};

export type Phase4SeedApartmentSpace = Phase4SeedSharedSpace & {
  space_number: number | null;
  sequence: number;
};

export type Phase4SeedApartment = {
  apartment_id: string;
  apartment_number: string;
  floor_number: number;
  sequence_on_floor: number;
  layout_type: string;
  spaces: Phase4SeedApartmentSpace[];
};

export type Phase4SeedBuildingLevel = {
  floor_id: string;
  floor_number: number;
  floor_label: string;
  shared_spaces: Phase4SeedSharedSpace[];
};

export type Phase4SeedFloor = Phase4SeedBuildingLevel & {
  apartments: Phase4SeedApartment[];
};

export type Phase4SeedBuilding = {
  building_id: string;
  site_id: string;
  project_id: string;
  building_name: string;
  building_code: string | null;
  building_type: string | null;
  address_line: string | null;
  above_ground_floor_count: number | null;
  has_basement: boolean | null;
  basement?: Phase4SeedBuildingLevel | null;
  floors: Phase4SeedFloor[];
};

export type Phase4SeedSite = {
  site_id: string;
  project_id: string;
  site_name: string;
  address_line?: string | null;
  city_district?: string | null;
  city?: string | null;
  country?: string | null;
  building_ids?: string[] | null;
  site_description?: string | null;
};


export type Phase4LevelScope =
  | {
    scope_type: "whole_building";
    floor_numbers: number[];
    includes_basement: true;
    scope_description: string;
  }
  | {
    scope_type: "specific_floors";
    floor_numbers: number[];
    includes_basement: false;
    scope_description: string;
  }
  | {
    scope_type: "basement_only";
    floor_numbers: [];
    includes_basement: true;
    scope_description: string;
  };



export type Phase4SeedProjectCompanyContext = {
  context_id: string;
  project_id: string;
  company_id: string;
  project_role: string | null;
  responsibility_description: string | null;
  work_type_ids: string[] | null;
  site_ids: string[] | null;
  building_ids: string[] | null;
  level_scope: Phase4LevelScope;
  apartment_scope: {
    scope_type: "all_apartments" | "specific_apartments";
    apartment_ids: string[];
    scope_description: string;
  };

  space_type_scope: {
    scope_type: "all_space_types" | "specific_space_types";
    space_types: string[];
    scope_description: string;
  };

  agreement_start_date: string;
  agreement_end_date: string;
  status: "active" | "inactive";
  scope_notes: string;
};

export type Phase4SeedWorkType = {
  work_type_id: string;
  name: string;
  description?: string | null;
  aliases_en?: string[] | null;
  example_issues_en?: string[] | null;
};

export type Phase4SeedBundle = {
  dataset_version: string;
  buildings: Phase4SeedBuilding[];
  projects: Phase4SeedProject[];
  companies: Phase4SeedCompany[];
  users: Phase4SeedUser[];
  sites: Phase4SeedSite[];
  projectCompanyContext: Phase4SeedProjectCompanyContext[];
  workTypes: Phase4SeedWorkType[];
};

export type Phase4SeedCollectionKey =
  Exclude<keyof Phase4SeedBundle, "dataset_version">;

export type Phase4SeedValidationResult = {
  valid: boolean;
  counts: Record<Phase4SeedCollectionKey, number>;
  errors: string[];
  warnings: string[];
};

export const getPhase4SeedBundle = (): Phase4SeedBundle =>
  seedBundleJson as Phase4SeedBundle;