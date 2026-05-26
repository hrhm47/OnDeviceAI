import {
  getPhase4SeedBundle,
  PHASE4_DEFAULT_USER_ID,
  type Phase4SeedArea,
  type Phase4SeedBundle,
  type Phase4SeedCompany,
  type Phase4SeedProject,
  type Phase4SeedProjectCompanyContext,
  type Phase4SeedUser,
} from "../data/phase4SeedData";
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
  areas: Phase4SeedArea[];
  companies: Phase4SeedCompany[];
  projectCompanyContext: Phase4SeedProjectCompanyContext[];
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
  const projectCompanyIds = new Set([
    ...projectCompanyContext.map((context) => context.company_id),
    activeUser.employer_company_id,
  ]);

  return {
    ok: true,
    context: {
      activeUser,
      project,
      areas: bundle.areas.filter((area) => area.project_id === project.project_id),
      companies: bundle.companies.filter((company) =>
        projectCompanyIds.has(company.company_id),
      ),
      projectCompanyContext,
      referenceData: buildProjectReferenceData({
        companies: bundle.companies.filter((company) =>
          projectCompanyIds.has(company.company_id),
        ),
        areas: bundle.areas.filter((area) => area.project_id === project.project_id),
        projectCompanyContext,
      }),
    },
  };
};

const buildProjectReferenceData = (input: {
  companies: Phase4SeedCompany[];
  areas: Phase4SeedArea[];
  projectCompanyContext: Phase4SeedProjectCompanyContext[];
}): Phase4ReferenceData => {
  const base = getPhase4ReferenceData();
  return {
    ...base,
    formSchema: {
      ...base.formSchema,
      allowedAreaOptions: input.areas.map((area) => area.area_label),
      fields: base.formSchema.fields.map((field) =>
        field.fieldId === "area"
          ? {
              ...field,
              allowedValues: input.areas.map((area) => area.area_label),
            }
          : field,
      ),
    },
    companies: input.companies.map((company) =>
      toCompanyReference(company, input.projectCompanyContext),
    ),
  };
};

const toCompanyReference = (
  company: Phase4SeedCompany,
  contexts: Phase4SeedProjectCompanyContext[],
): Phase4CompanyReference => {
  const companyContexts = contexts.filter(
    (context) => context.company_id === company.company_id,
  );
  const keywords = companyContexts.flatMap((context) =>
    splitKeywordText(context.trigger_keywords_en_fi),
  );
  const notes = companyContexts
    .flatMap((context) => [
      context.agreement_scope,
      context.candidate_match_note,
      context.note_count_interpretation,
    ])
    .filter((value): value is string => Boolean(value));

  return {
    companyId: company.company_id,
    displayName: company.company_name,
    primaryCategory: mapTradeGroup(company.primary_trade_group),
    responsibilitySummary: {
      en: [company.company_note, ...notes].filter(Boolean).join(" "),
      fi: [company.company_note, ...notes].filter(Boolean).join(" "),
    },
    workIntents: Array.from(
      new Set(companyContexts.map((context) => context.work_type_code)),
    ),
    roleLabels: {
      en: [company.primary_trade_group ?? "project company"],
      fi: [company.primary_trade_group ?? "project company"],
    },
    serviceKeywords: { en: keywords, fi: keywords },
    actionHints: {
      en: ["Korjaus", "Kuntoon"],
      fi: ["Korjaus", "Kuntoon"],
    },
    tagHints: inferTagHints(company, keywords),
  };
};

const mapTradeGroup = (
  tradeGroup: string | null | undefined,
): Phase4CompanyCategory => {
  const normalized = tradeGroup ?? "";
  if (normalized.includes("painting")) return "painting_finishing";
  if (normalized.includes("plumbing")) return "plumbing";
  if (normalized.includes("electrical")) return "electrical";
  if (normalized.includes("hvac")) return "hvac_ventilation";
  if (normalized.includes("cleaning")) return "cleaning";
  if (normalized.includes("door") || normalized.includes("window")) return "doors_windows";
  if (normalized.includes("floor") || normalized.includes("tiling")) return "flooring";
  if (normalized.includes("waterproofing") || normalized.includes("moisture")) return "sealing_waterproofing";
  if (normalized.includes("safety")) return "fall_protection";
  if (normalized.includes("excavation")) return "concrete";
  if (normalized.includes("concrete") || normalized.includes("foundation")) return "concrete";
  if (normalized.includes("crane")) return "site_logistics";
  return "site_logistics";
};

const inferTagHints = (
  company: Phase4SeedCompany,
  keywords: string[],
): Phase4TaskTag[] => {
  const text = `${company.primary_trade_group ?? ""} ${keywords.join(" ")}`.toLowerCase();
  if (text.includes("safety") || text.includes("guardrail") || text.includes("cable")) {
    return ["Safety"];
  }
  if (text.includes("clean") || text.includes("waste") || text.includes("dust")) {
    return ["Environment"];
  }
  return ["Quality"];
};

const splitKeywordText = (value: string | null | undefined) =>
  value?.split(";").map((item) => item.trim()).filter(Boolean) ?? [];
