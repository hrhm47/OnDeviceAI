import {
  getPhase4SeedBundle,
  PHASE4_DEFAULT_USER_ID,
  type Phase4SeedBuilding,
  type Phase4SeedBundle,
  type Phase4SeedCompany,
  type Phase4SeedProject,
  type Phase4SeedProjectCompanyContext,
  type Phase4SeedSite,
  type Phase4SeedUser,
  type Phase4SeedWorkType,
} from "../data/phase4SeedData";
import {
  buildPhase4DerivedAreas,
  type Phase4DerivedArea,
} from "../data/phase4DerivedAreas";
import { getPhase4ReferenceData } from "../referenceData/phase4ReferenceRepository";
import type {
  Phase4CompanyCategory,
  Phase4CompanyReference,
  Phase4ReferenceData,
  Phase4TaskTag,
} from "../types/phase4.types";

export type ProjectContextPackage = {
  activeUser: Phase4SeedUser;
  project: Phase4SeedProject;
  sites: Phase4SeedSite[];
  buildings: Phase4SeedBuilding[];
  areas: Phase4DerivedArea[];
  companies: Phase4SeedCompany[];
  projectCompanyContext: Phase4SeedProjectCompanyContext[];
  workTypes: Phase4SeedWorkType[];
  referenceData: Phase4ReferenceData;
};

export type ProjectContextLoadResult =
  | { ok: true; context: ProjectContextPackage }
  | { ok: false; errorMessage: string };

export const loadActiveProjectContext = (input?: {
  userId?: string;
  seedBundle?: Phase4SeedBundle;
}): ProjectContextLoadResult => {
  const bundle = input?.seedBundle ?? getPhase4SeedBundle();

  const userId = input?.userId ?? PHASE4_DEFAULT_USER_ID;
  const activeUser = bundle.users.find((user) => user.user_id === userId);
  if (!activeUser) {
    return { ok: false, errorMessage: `Phase 4 user ${userId} was not found.` };
  }

  const project = bundle.projects.find(
    (item) => item.project_id === activeUser.active_project_id,
  );
  if (!project) {
    return {
      ok: false,
      errorMessage: `Active project ${activeUser.active_project_id} was not found for user ${userId}.`,
    };
  }

  const projectCompanyContext = bundle.projectCompanyContext.filter(
    (context) => context.project_id === project.project_id,
  );
  const projectCompanyIds = new Set(
    projectCompanyContext.map((context) => context.company_id),
  );
  if (activeUser.employer_company_id) {
    projectCompanyIds.add(activeUser.employer_company_id);
  }

  const projectSites = bundle.sites.filter(
    (site) => site.project_id === project.project_id,
  );
  const projectBuildings = bundle.buildings.filter(
    (building) => building.project_id === project.project_id,
  );
  const projectAreas = buildPhase4DerivedAreas(bundle).filter(
    (area) => area.project_id === project.project_id,
  );
  const projectCompanies = bundle.companies.filter((company) =>
    projectCompanyIds.has(company.company_id),
  );

  return {
    ok: true,
    context: {
      activeUser,
      project,
      sites: projectSites,
      buildings: projectBuildings,
      areas: projectAreas,
      companies: projectCompanies,
      projectCompanyContext,
      workTypes: bundle.workTypes,
      referenceData: buildProjectReferenceData({
        companies: projectCompanies,
        areas: projectAreas,
        projectCompanyContext,
        workTypes: bundle.workTypes,
      }),
    },
  };
};

const buildProjectReferenceData = (input: {
  companies: Phase4SeedCompany[];
  areas: Phase4DerivedArea[];
  projectCompanyContext: Phase4SeedProjectCompanyContext[];
  workTypes: Phase4SeedWorkType[];
}): Phase4ReferenceData => {
  const base = getPhase4ReferenceData();
  const allowedAreaOptions = input.areas.map((area) => area.area_label);
  return {
    ...base,
    formSchema: {
      ...base.formSchema,
      allowedAreaOptions,
      fields: base.formSchema.fields.map((field) =>
        field.fieldId === "area"
          ? {
              ...field,
              allowedValues: allowedAreaOptions,
            }
          : field,
      ),
    },
    companies: input.companies.map((company) =>
      toCompanyReference(company, input.projectCompanyContext, input.workTypes),
    ),
  };
};

const toCompanyReference = (
  company: Phase4SeedCompany,
  contexts: Phase4SeedProjectCompanyContext[],
  workTypes: Phase4SeedWorkType[],
): Phase4CompanyReference => {
  const companyContexts = contexts.filter(
    (context) => context.company_id === company.company_id,
  );
  const workTypeIds = uniqueStrings([
    ...(company.general_capability_work_type_ids ?? []),
    ...companyContexts.flatMap((context) => context.work_type_ids ?? []),
  ]);
  const matchedWorkTypes = workTypeIds
    .map((workTypeId) => workTypes.find((workType) => workType.work_type_id === workTypeId))
    .filter((workType): workType is Phase4SeedWorkType => Boolean(workType));
  const keywords = uniqueStrings([
    ...workTypeIds,
    ...matchedWorkTypes.flatMap((workType) => [
      workType.name,
      workType.description,
      ...(workType.aliases_en ?? []),
      ...(workType.example_issues_en ?? []),
    ]),
  ]);
  const notes = compactStrings([
    company.company_description,
    ...companyContexts.flatMap((context) => [
      context.responsibility_description,
      context.scope_notes,
      context.level_scope?.scope_description,
      context.apartment_scope?.scope_description,
      context.space_type_scope?.scope_description,
    ]),
  ]);
  const categoryText = compactStrings([
    company.company_type,
    company.company_description,
    ...workTypeIds,
    ...matchedWorkTypes.map((workType) => workType.name),
  ]).join(" ");
  const roleLabels = compactStrings([
    ...companyContexts.map((context) => context.project_role),
    company.company_type,
    "project company",
  ]);

  return {
    companyId: company.company_id,
    displayName: company.company_name,
    primaryCategory: mapTradeGroup(categoryText),
    responsibilitySummary: {
      en: notes.join(" "),
      fi: notes.join(" "),
    },
    workIntents: workTypeIds,
    roleLabels: {
      en: roleLabels,
      fi: roleLabels,
    },
    serviceKeywords: { en: keywords, fi: keywords },
    actionHints: {
      en: ["Korjaus", "Kuntoon"],
      fi: ["Korjaus", "Kuntoon"],
    },
    tagHints: inferTagHints(categoryText, keywords),
  };
};

const mapTradeGroup = (
  tradeGroup: string | null | undefined,
): Phase4CompanyCategory => {
  const normalized = (tradeGroup ?? "").toLowerCase();
  if (normalized.includes("painting")) return "painting_finishing";
  if (normalized.includes("plumbing")) return "plumbing";
  if (normalized.includes("electrical")) return "electrical";
  if (normalized.includes("hvac")) return "hvac_ventilation";
  if (normalized.includes("cleaning")) return "cleaning";
  if (normalized.includes("door") || normalized.includes("window")) return "doors_windows";
  if (normalized.includes("floor") || normalized.includes("tiling")) return "flooring";
  if (normalized.includes("waterproofing") || normalized.includes("seal")) {
    return "sealing_waterproofing";
  }
  if (normalized.includes("safety")) return "fall_protection";
  if (normalized.includes("concrete") || normalized.includes("foundation")) return "concrete";
  return "site_logistics";
};

const inferTagHints = (
  categoryText: string,
  keywords: string[],
): Phase4TaskTag[] => {
  const text = `${categoryText} ${keywords.join(" ")}`.toLowerCase();
  if (text.includes("safety") || text.includes("guardrail") || text.includes("cable")) {
    return ["Safety"];
  }
  if (text.includes("clean") || text.includes("waste") || text.includes("dust")) {
    return ["Environment"];
  }
  return ["Quality"];
};

const compactStrings = (values: (string | number | null | undefined)[]) =>
  values.map((value) => String(value ?? "").trim()).filter(Boolean);

const uniqueStrings = (values: (string | number | null | undefined)[]) =>
  Array.from(new Set(compactStrings(values)));
