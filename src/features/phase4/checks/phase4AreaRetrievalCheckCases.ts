export type Phase4AreaRetrievalCheckCase = {
  checkId: string;
  userId: string;
  transcript: string;
  expectedAreaCandidates: string[];
};

export const PHASE4_AREA_RETRIEVAL_CHECK_CASES: readonly Phase4AreaRetrievalCheckCase[] = [
  {
    checkId: "phase4_area_p1_first_floor_staircase",
    userId: "u_timmo",
    transcript: "paint damage on first floor staircase",
    expectedAreaCandidates: ["Suppose 1 / Floor 1 / Staircase"],
  },
  {
    checkId: "phase4_area_p2_a203_bathroom",
    userId: "u_leena",
    transcript: "cracked tile in apartment A203 bathroom",
    expectedAreaCandidates: ["Building A / Floor 2 / A203 / Bathroom"],
  },
  {
    checkId: "phase4_area_p2_north_trench",
    userId: "u_leena",
    transcript: "standing water near the north trench",
    expectedAreaCandidates: ["Building B / North Trench"],
  },
  {
    checkId: "phase4_area_p2_temporary_power",
    userId: "u_jukka",
    transcript: "exposed cable near temporary power area",
    expectedAreaCandidates: ["Building B / Temporary Power Area"],
  },
  {
    checkId: "phase4_area_p3_s204_kitchen",
    userId: "u_elisa",
    transcript: "moisture near studio S204 kitchen wall",
    expectedAreaCandidates: ["Building A / Floor 2 / S204 / Kitchen"],
  },
  {
    checkId: "phase4_area_p3_first_floor_staircase_alternatives",
    userId: "u_riku",
    transcript: "paint damage on first floor staircase",
    expectedAreaCandidates: [
      "Building A / Floor 1 / Staircase",
      "Building B / Floor 1 / Staircase",
    ],
  },
];
