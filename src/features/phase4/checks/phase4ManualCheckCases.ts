import type {
  Phase4AllowedDueDate,
  Phase4Language,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "../types/phase4.types";

export type Phase4ManualCheckCase = {
  checkId: string;
  userId?: string;
  language: Phase4Language;
  transcript: string;
  expected: {
    companyName?: string | null;
    companyId?: string | null;
    companyStatus?: "suggested" | "extracted" | "manual_required";
    descriptionContains: string;
    areaValue?: string | null;
    areaId?: string | null;
    requiredActionCode?: string | null;
    requiredAction: Phase4RequiredAction | null;
    dueDateCode?: "now" | "plus_3_days" | "plus_7_days" | null;
    requiredActionDueDate: Phase4AllowedDueDate | string | null;
    tags: Phase4TaskTag[];
    notifications: false;
    reviewWorkIntent?: string | null;
    reviewSpokenDueDateText?: string | null;
    reviewSpokenCompanyText?: string | null;
    reviewCompanyName?: string;
    hybridProjectId?: string;
    hybridMinExactCount?: number;
    hybridAreaCandidate?: string;
    hybridWorkTypeCandidate?: string;
  };
};

export const PHASE4_MANUAL_CHECK_CASES: readonly Phase4ManualCheckCase[] = [
  {
    checkId: "phase4_hybrid_check_a201_bathroom_pipe_leak",
    userId: "u_timmo",
    language: "en",
    transcript:
      "There is a pipe leak in the bathroom apartment A201. It needs to be fixed today. Mark it as quality.",
    expected: {
      companyId: "c_aquapipe",
      companyName: "AquaPipe Finland Oy",
      companyStatus: "suggested",
      descriptionContains: "pipe leak",
      areaValue: "Suppose 1 / Floor 2 / A201 / Bathroom",
      areaId: "area_p1_alppila_p1_suppose1_a201_bathroom",
      requiredActionCode: "repair",
      requiredAction: "Korjaus",
      dueDateCode: "now",
      requiredActionDueDate: "Now",
      tags: ["Quality"],
      notifications: false,
      hybridProjectId: "p1_alppila",
      hybridMinExactCount: 1,
      hybridAreaCandidate: "Suppose 1 / Floor 2 / A201 / Bathroom",
      hybridWorkTypeCandidate: "plumbing",
    },
  },
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
      companyName: "PintaFix Oy",
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
      requiredAction: "Kuntoon",
      requiredActionDueDate: null,
      tags: ["Palokatko", "Safety"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_balcony_door_c204",
    language: "en",
    transcript:
      "The balcony door in apartment C204 does not close properly and cold air is coming through the seal.",
    expected: {
      companyName: "Window and Door Service Oy",
      companyStatus: "suggested",
      descriptionContains: "balcony door",
      areaValue: "Apartment C204 balcony door",
      requiredAction: "Korjaus",
      requiredActionDueDate: "tomorrow",
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_entrance_door_d208",
    language: "en",
    transcript:
      "The entrance door of apartment D208 rubs against the frame and the lock is difficult to turn.",
    expected: {
      companyName: "DoorFix Rakennus Oy",
      companyStatus: "suggested",
      descriptionContains: "entrance door",
      areaValue: "Apartment D208 entrance door",
      requiredAction: "Korjaus",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_paint_window_b115",
    language: "en",
    transcript:
      "The kitchen wall in apartment B115 has visible paint damage near the window.",
    expected: {
      companyName: "Alppila Paint Masters Oy",
      companyStatus: "suggested",
      descriptionContains: "paint damage",
      areaValue: "Apartment B115 kitchen",
      requiredAction: "Maalataan uudestaan",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_waterproofing_b307",
    language: "en",
    transcript:
      "The waterproofing membrane is visible behind the shower wall tile in apartment B307.",
    expected: {
      companyName: "WetRoom Shield Oy",
      companyStatus: "suggested",
      descriptionContains: "waterproofing membrane",
      areaValue: "Apartment B307 shower wall",
      requiredAction: "Korjaus",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_radiator_a105",
    language: "en",
    transcript:
      "The radiator in apartment A105 bedroom is not heating properly. Check the valve and report back.",
    expected: {
      companyName: "NorthFlow LVI Oy",
      companyStatus: "suggested",
      descriptionContains: "radiator",
      areaValue: "Apartment A105 bedroom",
      requiredAction: "Korjaus",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_bathroom_sink_c310",
    language: "en",
    transcript:
      "The bathroom sink in apartment C310 drains slowly and there is a small leak under the trap.",
    expected: {
      companyName: "AquaPipe Finland Oy",
      companyStatus: "suggested",
      descriptionContains: "bathroom sink",
      areaValue: "Apartment C310 bathroom sink",
      requiredAction: "Korjaus",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
    },
  },
  {
    checkId: "phase4_check_gas_connection_tomorrow",
    language: "en",
    transcript: "There is a need of gas connection tomorrow.",
    expected: {
      companyName: "AquaPipe Finland Oy",
      companyStatus: "suggested",
      descriptionContains: "gas connection",
      areaValue: null,
      requiredAction: "Korjaus",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
      reviewWorkIntent: "gas_connection",
      reviewSpokenDueDateText: "tomorrow",
      reviewCompanyName: "AquaPipe Finland Oy",
    },
  },
  {
    checkId: "phase4_check_invented_company_preserved",
    language: "en",
    transcript:
      "Ask SuperFast Builder Company to fix the leaking pipe today.",
    expected: {
      companyName: "AquaPipe Finland Oy",
      companyStatus: "suggested",
      descriptionContains: "leaking pipe",
      areaValue: null,
      requiredAction: "Korjaus",
      requiredActionDueDate: "Now",
      tags: ["Quality"],
      notifications: false,
      reviewSpokenCompanyText: "SuperFast Builder Company",
    },
  },
  {
    checkId: "phase4_hybrid_check_a305_paint_damage",
    userId: "u_timmo",
    language: "en",
    transcript: "There is paint damage in apartment A305 living room near the window.",
    expected: {
      companyName: "Alppila Paint Masters Oy",
      companyStatus: "suggested",
      descriptionContains: "paint damage",
      areaValue: "Suppose 1 / Floor 3 / A305 / Living Room",
      requiredAction: "Maalataan uudestaan",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
      hybridProjectId: "p1_alppila",
      hybridMinExactCount: 1,
      hybridAreaCandidate: "Suppose 1 / Floor 3 / A305 / Living Room",
      hybridWorkTypeCandidate: "interior_finishing",
    },
  },
  {
    checkId: "phase4_hybrid_check_a305_wall_finish_semantic_wording",
    userId: "u_timmo",
    language: "en",
    transcript: "The wall finish looks bad near the window in apartment A305 living room.",
    expected: {
      companyName: "PintaFix Oy",
      companyStatus: "suggested",
      descriptionContains: "wall finish",
      areaValue: "Suppose 1 / Floor 3 / A305 / Living Room",
      requiredAction: null,
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
      hybridProjectId: "p1_alppila",
      hybridMinExactCount: 1,
      hybridAreaCandidate: "Suppose 1 / Floor 3 / A305 / Living Room",
      hybridWorkTypeCandidate: "interior_finishing",
    },
  },
  {
    checkId: "phase4_hybrid_check_north_trench_water",
    userId: "u_leena",
    language: "en",
    transcript: "There is standing water near the north trench in Building B.",
    expected: {
      companyName: "Oulu Excavation Oy",
      companyStatus: "suggested",
      descriptionContains: "standing water",
      areaValue: "Building B / North Trench",
      requiredAction: null,
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
      hybridProjectId: "p2_tuira",
      hybridMinExactCount: 1,
      hybridAreaCandidate: "Building B / North Trench",
      hybridWorkTypeCandidate: "foundation_groundworks",
    },
  },
  {
    checkId: "phase4_hybrid_check_corridor_exposed_cable",
    userId: "u_timmo",
    language: "en",
    transcript: "There is an exposed cable in the corridor. This is a safety issue.",
    expected: {
      companyName: "NorthVolt Electrical Oy",
      companyStatus: "suggested",
      descriptionContains: "exposed cable",
      areaValue: "Suppose 1 corridor",
      requiredAction: "Korjaus",
      requiredActionDueDate: null,
      tags: ["Safety"],
      notifications: false,
      hybridProjectId: "p1_alppila",
      hybridMinExactCount: 1,
      hybridAreaCandidate: "Suppose 1 corridor",
      hybridWorkTypeCandidate: "electrical",
    },
  },
  {
    checkId: "phase4_hybrid_check_vague_input",
    userId: "u_timmo",
    language: "en",
    transcript: "Something is wrong here.",
    expected: {
      companyName: null,
      companyStatus: "manual_required",
      descriptionContains: "Something is wrong",
      areaValue: null,
      requiredAction: null,
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
      hybridProjectId: "p1_alppila",
    },
  },
  {
    checkId: "phase4_hybrid_check_nallikari_moisture",
    userId: "u_elisa",
    language: "en",
    transcript:
      "There is moisture on the wall in apartment B205 bathroom and waterproofing needs inspection.",
    expected: {
      companyName: "MoistureSafe Oy",
      companyStatus: "suggested",
      descriptionContains: "moisture",
      areaValue: "Building B / Floor 2 / B205 / Bathroom",
      requiredAction: "Korjaus",
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
      hybridProjectId: "p3_nallikari",
      hybridMinExactCount: 1,
      hybridAreaCandidate: "Building B / Floor 2 / B205 / Bathroom",
      hybridWorkTypeCandidate: "plumbing_moisture",
    },
  },
  {
    checkId: "phase4_hybrid_check_multi_issue",
    userId: "u_timmo",
    language: "en",
    transcript:
      "Paint is damaged in apartment A305 living room, bathroom silicone is missing, and the balcony door does not close.",
    expected: {
      companyName: "PintaFix Oy",
      companyStatus: "suggested",
      descriptionContains: "Paint is damaged",
      areaValue: "Suppose 1 / Floor 3 / A305 / Living Room",
      requiredAction: null,
      requiredActionDueDate: null,
      tags: ["Quality"],
      notifications: false,
      hybridProjectId: "p1_alppila",
      hybridMinExactCount: 1,
      hybridAreaCandidate: "Suppose 1 / Floor 3 / A305 / Living Room",
      hybridWorkTypeCandidate: "interior_finishing",
    },
  },
];
