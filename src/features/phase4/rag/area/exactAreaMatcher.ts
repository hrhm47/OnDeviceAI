import type { GeneratedProjectArea } from "./generateProjectAreas";

const ROOM_ALIASES: Record<string, string[]> = {
  bathroom: ["bathroom", "washroom", "toilet", "wc", "kylpyhuone", "pesuhuone"],
  kitchen: ["kitchen", "keittiö"],
  living_room: ["living room", "olohuone"],
  bedroom: ["bedroom", "makuuhuone"],
  balcony: ["balcony", "parveke"],
};

export type ExactProjectAreaMatch = {
  areaId: string;
  displayName: string;
  confidence: "high" | "medium" | "low";
  matchType: "exact";
  evidence: string[];
};

export function matchAreaFromTranscript(input: {
  transcript: string;
  generatedAreas: GeneratedProjectArea[];
  projectBuildingCount: number;
  userDefaultBuildingId?: string | null;
}): {
  areaCandidates: ExactProjectAreaMatch[];
  spokenAreaText: string | null;
} {
  const normalized = normalizeText(input.transcript);

  const unitCandidate = matchUnitRoomArea(normalized, input.generatedAreas);
  if (unitCandidate) {
    return {
      areaCandidates: [unitCandidate],
      spokenAreaText: unitCandidate.displayName,
    };
  }

  const locationCandidates = matchGeneratedLocation(normalized, input);
  return {
    areaCandidates: locationCandidates,
    spokenAreaText: locationCandidates[0]?.displayName ?? null,
  };
}

function matchUnitRoomArea(
  normalizedTranscript: string,
  generatedAreas: GeneratedProjectArea[],
): ExactProjectAreaMatch | null {
  const unitMatch = normalizedTranscript.match(/\b([a-z])\s?(\d{3})\b/i);

  if (!unitMatch?.[1] || !unitMatch[2]) {
    return null;
  }

  const unitCode = `${unitMatch[1]}${unitMatch[2]}`.toUpperCase();
  const roomType = findAliasKey(normalizedTranscript, ROOM_ALIASES);
  const candidates = generatedAreas.filter(
    (area) => area.areaType === "unit_room" && area.unitCode === unitCode,
  );
  const area = roomType
    ? candidates.find((candidate) => candidate.roomType === roomType)
    : candidates[0];

  if (!area) {
    return null;
  }

  return {
    areaId: area.areaId,
    displayName: area.displayName,
    confidence: roomType ? "high" : "medium",
    matchType: "exact",
    evidence: [
      `matched unit ${unitCode}`,
      ...(roomType ? [`matched room ${roomType}`] : []),
    ],
  };
}

function matchGeneratedLocation(
  normalizedTranscript: string,
  input: {
    generatedAreas: GeneratedProjectArea[];
    projectBuildingCount: number;
    userDefaultBuildingId?: string | null;
  },
): ExactProjectAreaMatch[] {
  const floorNumber = extractFloorNumber(normalizedTranscript);
  const matchedBuildingId = findMentionedBuildingId(
    normalizedTranscript,
    input.generatedAreas,
  );
  let candidates = input.generatedAreas
    .filter((area) => area.areaType !== "unit_room")
    .filter((area) => {
      if (area.areaType === "shared_floor_area" && floorNumber == null) {
        return false;
      }
      if (matchedBuildingId && area.buildingId !== matchedBuildingId) {
        return false;
      }
      if (floorNumber != null && area.floorNumber !== floorNumber) {
        return false;
      }
      return areaAliasMatches(normalizedTranscript, area);
    });

  if (candidates.length === 0) {
    return [];
  }

  candidates = sortLocationCandidates(candidates);

  if (input.projectBuildingCount === 1 || matchedBuildingId) {
    return candidates.slice(0, 1).map((area) =>
      toExactMatch(area, "high", [
        ...(floorNumber ? [`matched floor ${floorNumber}`] : []),
        ...(matchedBuildingId ? [`matched building ${area.buildingName}`] : []),
        "matched project area alias",
      ]),
    );
  }

  const candidateBuildingIds = new Set(candidates.map((area) => area.buildingId));
  if (candidateBuildingIds.size === 1) {
    return candidates.slice(0, 1).map((area) =>
      toExactMatch(area, "high", [
        ...(floorNumber ? [`matched floor ${floorNumber}`] : []),
        "matched project area alias",
        "area is unique in active project",
      ]),
    );
  }

  if (input.userDefaultBuildingId) {
    const defaultBuildingCandidates = candidates.filter(
      (area) => area.buildingId === input.userDefaultBuildingId,
    );
    if (defaultBuildingCandidates.length > 0) {
      return defaultBuildingCandidates.slice(0, 1).map((area) =>
        toExactMatch(area, "medium", [
          ...(floorNumber ? [`matched floor ${floorNumber}`] : []),
          "matched project area alias",
          "used user default building",
        ]),
      );
    }
  }

  return candidates.slice(0, 5).map((area) =>
    toExactMatch(area, "low", [
      ...(floorNumber ? [`matched floor ${floorNumber}`] : []),
      "matched project area alias",
      "multiple buildings possible; user confirmation needed",
    ]),
  );
}

function areaAliasMatches(
  normalizedTranscript: string,
  area: GeneratedProjectArea,
): boolean {
  const aliases = [area.displayName, area.zoneCode, ...area.aliases]
    .filter((value): value is string => Boolean(value))
    .map(normalizeText);

  return aliases.some((alias) => alias.length >= 2 && normalizedTranscript.includes(alias));
}

function findMentionedBuildingId(
  normalizedTranscript: string,
  generatedAreas: GeneratedProjectArea[],
): string | null {
  for (const area of generatedAreas) {
    const aliases = [area.buildingName, `${area.buildingName.toLowerCase()} building`];
    if (aliases.some((alias) => normalizedTranscript.includes(normalizeText(alias)))) {
      return area.buildingId;
    }
  }
  return null;
}

function sortLocationCandidates(areas: GeneratedProjectArea[]) {
  return [...areas].sort((first, second) => {
    const typeScore = areaTypeScore(second) - areaTypeScore(first);
    if (typeScore !== 0) {
      return typeScore;
    }
    return first.displayName.localeCompare(second.displayName);
  });
}

function areaTypeScore(area: GeneratedProjectArea) {
  if (area.areaType === "foundation_zone" || area.areaType === "site_area") {
    return 40;
  }
  if (area.areaType === "shared_floor_area") {
    return 35;
  }
  if (area.areaType === "structural_zone") {
    return 30;
  }
  return 20;
}

function toExactMatch(
  area: GeneratedProjectArea,
  confidence: "high" | "medium" | "low",
  evidence: string[],
): ExactProjectAreaMatch {
  return {
    areaId: area.areaId,
    displayName: area.displayName,
    confidence,
    matchType: "exact",
    evidence,
  };
}

function extractFloorNumber(normalizedTranscript: string): number | null {
  const direct = normalizedTranscript.match(/\bfloor\s*(\d+)\b/);
  if (direct?.[1]) {
    return Number(direct[1]);
  }

  const ordinalMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    ensimmäinen: 1,
    toinen: 2,
    kolmas: 3,
    neljäs: 4,
    viides: 5,
  };

  for (const [word, floor] of Object.entries(ordinalMap)) {
    if (normalizedTranscript.includes(`${word} floor`)) {
      return floor;
    }
  }

  return null;
}

function findAliasKey(
  normalizedTranscript: string,
  aliasesByKey: Record<string, string[]>,
): string | null {
  for (const [key, aliases] of Object.entries(aliasesByKey)) {
    if (
      aliases.some((alias) =>
        normalizedTranscript.includes(normalizeText(alias)),
      )
    ) {
      return key;
    }
  }

  return null;
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
