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
import type { Phase4ReferenceData } from "../types/phase4.types";

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
      referenceData: getPhase4ReferenceData(),
    },
  };
};
