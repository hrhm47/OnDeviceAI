import type { GeneratedArea } from "./generateApartmentAreas";

const ROOM_ALIASES: Record<string, string[]> = {
  bathroom: ["bathroom", "washroom", "toilet", "wc", "kylpyhuone", "pesuhuone"],
  kitchen: ["kitchen", "keittio", "keittiö"],
  living_room: ["living room", "olohuone"],
  bedroom: ["bedroom", "makuuhuone"],
  balcony: ["balcony", "parveke"],
  corridor: ["corridor", "hallway", "kaytava", "käytävä"],
};

export type ExactAreaMatch = {
  areaId: string;
  displayName: string;
  unitCode: string;
  roomType: string | null;
  confidence: "high" | "medium";
  evidence: string[];
  matchType: "exact";
};

export function matchApartmentAreaFromTranscript(input: {
  transcript: string;
  generatedAreas: GeneratedArea[];
}): ExactAreaMatch | null {
  const normalized = normalizeText(input.transcript);
  const unitMatch = normalized.match(/\b([a-z])\s?(\d{3})\b/i);

  if (!unitMatch?.[1] || !unitMatch[2]) {
    return null;
  }

  const unitCode = `${unitMatch[1]}${unitMatch[2]}`.toUpperCase();
  const roomType = findRoomType(normalized);
  const area = roomType
    ? input.generatedAreas.find(
        (candidate) =>
          candidate.unitCode === unitCode && candidate.roomType === roomType,
      )
    : input.generatedAreas.find((candidate) => candidate.unitCode === unitCode);

  if (!area) {
    return null;
  }

  return {
    areaId: area.areaId,
    displayName: area.displayName,
    unitCode,
    roomType: roomType ?? null,
    confidence: roomType ? "high" : "medium",
    evidence: [
      `matched unit ${unitCode}`,
      ...(roomType ? [`matched room ${roomType}`] : []),
    ],
    matchType: "exact",
  };
}

function findRoomType(normalizedTranscript: string): string | null {
  for (const [roomType, aliases] of Object.entries(ROOM_ALIASES)) {
    if (
      aliases.some((alias) =>
        normalizedTranscript.includes(normalizeText(alias)),
      )
    ) {
      return roomType;
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
