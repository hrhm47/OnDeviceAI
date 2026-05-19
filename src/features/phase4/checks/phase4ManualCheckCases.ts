import type {
  Phase4AllowedDueDate,
  Phase4Language,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "../types/phase4.types";

export type Phase4ManualCheckCase = {
  checkId: string;
  language: Phase4Language;
  transcript: string;
  expected: {
    companyName: string;
    companyStatus: "suggested" | "extracted" | "manual_required";
    descriptionContains: string;
    areaValue: string | null;
    requiredAction: Phase4RequiredAction | null;
    requiredActionDueDate: Phase4AllowedDueDate | null;
    tags: Phase4TaskTag[];
    notifications: false;
  };
};

export const PHASE4_MANUAL_CHECK_CASES: readonly Phase4ManualCheckCase[] = [
  {
    checkId: "phase4_check_pipe_leak_quality_today",
    language: "en",
    transcript:
      "There is a pipe leak in the bathroom. It needs to be fixed today. Mark it as quality.",
    expected: {
      companyName: "AquaPipe Finland Oy",
      companyStatus: "suggested",
      descriptionContains: "pipe leak",
      areaValue: null,
      requiredAction: "Korjaus",
      requiredActionDueDate: "Now",
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_wall_scratch_painting",
    language: "en",
    transcript:
      "There is a scratch on the wall in Kortermaja 1. It should be painted again within a week. Mark it as quality.",
    expected: {
      companyName: "MaalausMestarit Oy",
      companyStatus: "suggested",
      descriptionContains: "scratch on the wall",
      areaValue: "Kortermaja 1",
      requiredAction: "Maalataan uudestaan",
      requiredActionDueDate: "+7 days",
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_missing_sealant",
    language: "en",
    transcript:
      "The sealant around the window is missing. It should be sealed within three days.",
    expected: {
      companyName: "SealPro Finland Oy",
      companyStatus: "suggested",
      descriptionContains: "sealant",
      areaValue: null,
      requiredAction: "Kittaus ja maalaus",
      requiredActionDueDate: "+3 days",
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_electrical_safety",
    language: "en",
    transcript:
      "There is an exposed cable in the corridor. This is a safety issue and should be fixed today.",
    expected: {
      companyName: "North Electric Oy",
      companyStatus: "suggested",
      descriptionContains: "exposed cable",
      areaValue: null,
      requiredAction: "Korjaus",
      requiredActionDueDate: "Now",
      tags: ["Safety"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_finnish_vesivuoto",
    language: "fi",
    transcript:
      "Kylpyhuoneessa on vesivuoto. Se pitää korjata tänään ja merkitään laatuun.",
    expected: {
      companyName: "AquaPipe Finland Oy",
      companyStatus: "suggested",
      descriptionContains: "vesivuoto",
      areaValue: null,
      requiredAction: "Korjaus",
      requiredActionDueDate: "Now",
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_finnish_palokatko",
    language: "fi",
    transcript:
      "Palokatko puuttuu läpiviennin kohdalta Kortermaja 2:ssa. Tämä on turvallisuusasia.",
    expected: {
      companyName: "PaloStop Oy",
      companyStatus: "suggested",
      descriptionContains: "Palokatko",
      areaValue: "Kortermaja 2",
      requiredAction: null,
      requiredActionDueDate: null,
      tags: ["Palokatko", "Safety"],
      notifications: false,
    },
  },
];
