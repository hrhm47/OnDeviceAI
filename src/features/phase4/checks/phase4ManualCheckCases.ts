import type {
  Phase4AllowedDueDate,
  Phase4Language,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "../types/phase4.types";

export type Phase4ManualCheckCase = {
  checkCaseId: string;
  title: string;
  language: Phase4Language;
  transcript: string;
  expected: {
    company?: string;
    companyStatus?: string;
    descriptionContains?: string;
    area?: string | null;
    requiredAction?: Phase4RequiredAction;
    dueDate?: Phase4AllowedDueDate;
    tags?: Phase4TaskTag[];
  };
};

export const PHASE4_MANUAL_CHECK_CASES: readonly Phase4ManualCheckCase[] = [
  {
    checkCaseId: "phase4_check_pipe_leak_quality_today",
    title: "Pipe leak / quality / today",
    language: "en",
    transcript: "There is a pipe leak in the bathroom. It needs to be fixed today. Mark it as quality.",
    expected: { company: "AquaPipe Finland Oy", companyStatus: "suggested", descriptionContains: "pipe leak", area: null, requiredAction: "Korjaus", dueDate: "Now", tags: ["Quality"] },
  },
  {
    checkCaseId: "phase4_check_wall_scratch_painting_week",
    title: "Wall scratch / painting / Kortermaja 1 / within a week",
    language: "en",
    transcript: "There is a wall scratch in Kortermaja 1. Painting needs to redo it within a week. Mark it as quality.",
    expected: { company: "MaalausMestarit Oy", area: "Kortermaja 1", requiredAction: "Maalataan uudestaan", dueDate: "+7 days", tags: ["Quality"] },
  },
  {
    checkCaseId: "phase4_check_missing_sealant_three_days",
    title: "Missing sealant / within three days",
    language: "en",
    transcript: "Sealant is missing around the wet room joint. It should be fixed within three days and marked as quality.",
    expected: { company: "SealPro Finland Oy", dueDate: "+3 days", tags: ["Quality"] },
  },
  {
    checkCaseId: "phase4_check_electrical_safety",
    title: "Electrical safety issue",
    language: "en",
    transcript: "There is an electrical safety issue with a loose cable. It needs repair today.",
    expected: { company: "North Electric Oy", requiredAction: "Korjaus", dueDate: "Now", tags: ["Safety"] },
  },
  {
    checkCaseId: "phase4_check_finnish_water_leak",
    title: "Finnish water leak",
    language: "fi",
    transcript: "Kylpyhuoneessa on vesivuoto. Se pitää korjata tänään ja merkitään laatuun.",
    expected: { company: "AquaPipe Finland Oy", requiredAction: "Korjaus", dueDate: "Now", tags: ["Quality"] },
  },
  {
    checkCaseId: "phase4_check_finnish_fire_stopping",
    title: "Finnish fire stopping",
    language: "fi",
    transcript: "Kortermaja 2 palokatko läpiviennin ympäriltä pitää korjata ja merkitä turvallisuuteen.",
    expected: { company: "PaloStop Oy", area: "Kortermaja 2", tags: ["Palokatko", "Safety"] },
  },
] as const;
