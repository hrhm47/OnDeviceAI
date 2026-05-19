import type {
  Phase4AllowedDueDate,
  Phase4Candidate,
  Phase4CandidateConfidence,
  Phase4CandidateResolution,
  Phase4CompanyCandidate,
  Phase4ReferenceData,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "../types/phase4.types";

export const resolvePhase4Candidates = (input: {
  transcript: string;
  referenceData: Phase4ReferenceData;
}): Phase4CandidateResolution => {
  const transcript = input.transcript.trim();
  const normalized = normalize(transcript);
  const companyCandidates = rankCompanyCandidates(input.referenceData, normalized);
  const areaCandidates = resolveAreaCandidates(transcript, normalized);

  return {
    companyCandidates,
    areaCandidates,
    requiredActionCandidates: resolveActionCandidates(normalized),
    dueDateCandidates: resolveDueDateCandidates(normalized),
    tagCandidates: resolveTagCandidates(normalized),
  };
};

const rankCompanyCandidates = (
  referenceData: Phase4ReferenceData,
  normalized: string,
): Phase4CompanyCandidate[] =>
  referenceData.companies
    .map((company) => {
      const keywords = [
        ...company.serviceKeywords.en,
        ...company.serviceKeywords.fi,
        ...company.roleLabels.en,
        ...company.roleLabels.fi,
      ];
      const matched = keywords.filter((keyword) =>
        normalized.includes(normalize(keyword)),
      );
      const categoryBoost = company.isDefaultForCategory ? 1 : 0;
      const score = matched.length ? matched.length * 2 + categoryBoost : 0;

      const confidence: Phase4CandidateConfidence =
        score >= 5 ? "high" : score >= 3 ? "medium" : "low";

      return {
        value: {
          companyId: company.companyId,
          displayName: company.displayName,
        },
        confidence,
        evidence: matched.join(", "),
        reason: matched.length
          ? `Matched local company keywords: ${matched.join(", ")}.`
          : "No direct keyword match.",
        score,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(({ score: _score, ...candidate }) => candidate);

const resolveAreaCandidates = (
  transcript: string,
  normalized: string,
): Phase4Candidate<string>[] => {
  const apartmentMatch = transcript.match(/\b(?:apartment|asunnon|asunto)\s+([A-Z]\d{3})\b/i);
  if (!apartmentMatch?.[1]) {
    return knownLocationCandidates(normalized);
  }

  const apartmentId = apartmentMatch[1].toUpperCase();
  const suffix = resolveApartmentAreaSuffix(normalized);
  return [
    {
      value: suffix ? `Apartment ${apartmentId} ${suffix}` : `Apartment ${apartmentId}`,
      confidence: suffix ? "high" : "medium",
      evidence: apartmentMatch[0],
      reason: "Derived area from spoken apartment identifier and local Phase 2 location pattern.",
    },
  ];
};

const resolveApartmentAreaSuffix = (normalized: string) => {
  if (matchesAny(normalized, ["balcony door", "parvekkeen ovi"])) {
    return "balcony door";
  }
  if (matchesAny(normalized, ["entrance door", "ulko ovi"])) {
    return "entrance door";
  }
  if (matchesAny(normalized, ["bathroom sink", "sink", "pesuallas"])) {
    return "bathroom sink";
  }
  if (matchesAny(normalized, ["bathroom floor", "floor tiles", "lattia"])) {
    return "bathroom floor";
  }
  if (matchesAny(normalized, ["shower wall", "suihkuseinä"])) {
    return "shower wall";
  }
  if (matchesAny(normalized, ["bedroom", "makuuhuone"])) {
    return "bedroom";
  }
  if (matchesAny(normalized, ["kitchen", "keittiö"])) {
    return "kitchen";
  }
  if (matchesAny(normalized, ["living room", "olohuone"])) {
    return "living room";
  }
  return "";
};

const knownLocationCandidates = (normalized: string): Phase4Candidate<string>[] => {
  const locations = [
    ["staircase b", "Staircase B, third floor"],
    ["main entrance", "Main entrance"],
    ["fourth floor corridor", "Fourth floor corridor"],
    ["basement technical room", "Basement technical room"],
    ["roof level", "Roof level, ventilation unit"],
    ["loading area", "Loading area"],
    ["second floor meeting room", "Second floor meeting room"],
    ["scaffold near west facade", "Scaffold near west facade"],
    ["elevator shaft", "Elevator shaft opening"],
    ["parking garage ramp", "Parking garage ramp"],
  ] as const;

  return locations
    .filter(([needle]) => normalized.includes(needle))
    .map(([, value]) => ({
      value,
      confidence: "high",
      evidence: value,
      reason: "Matched local Phase 2 location phrase.",
    }));
};

const resolveActionCandidates = (
  normalized: string,
): Phase4Candidate<Phase4RequiredAction>[] => {
  if (matchesAny(normalized, ["paint", "painted again", "maala", "maalata"])) {
    return [candidate("Maalataan uudestaan", "medium", "paint", "Painting damage implies repainting.")];
  }
  if (matchesAny(normalized, ["loose", "does not close", "cold air", "leak", "drains slowly", "not heating", "rubs", "lock", "seal", "waterproofing", "membrane", "tiiviste", "vuoto", "hankaa", "lukko"])) {
    return [candidate("Korjaus", "medium", "defect wording", "Physical defect wording implies repair.")];
  }
  if (matchesAny(normalized, ["missing", "puuttuu"])) {
    return [candidate("Kuntoon", "medium", "missing", "Missing item should be made complete.")];
  }
  return [];
};

const resolveDueDateCandidates = (
  normalized: string,
): Phase4Candidate<Phase4AllowedDueDate>[] => {
  if (matchesAny(normalized, ["today", "tänään"])) {
    return [candidate("Now", "high", "today", "Transcript explicitly says today.")];
  }
  if (matchesAny(normalized, ["three days", "within three days", "kolme päivää"])) {
    return [candidate("+3 days", "high", "three days", "Transcript explicitly says within three days.")];
  }
  if (matchesAny(normalized, ["within a week", "week", "viikko"])) {
    return [candidate("+7 days", "high", "week", "Transcript explicitly says within a week.")];
  }
  return [];
};

const resolveTagCandidates = (
  normalized: string,
): Phase4Candidate<Phase4TaskTag>[] => {
  if (matchesAny(normalized, ["safety", "hazard", "loose cable", "scaffold", "fall", "turvallisuus", "kaapeli"])) {
    return [candidate("Safety", "high", "safety wording", "Safety wording maps to Safety tag.")];
  }
  if (matchesAny(normalized, ["fire stop", "palokatko"])) {
    return [
      candidate("Palokatko", "high", "palokatko", "Fire stopping wording maps to Palokatko tag."),
      candidate("Safety", "high", "fire stopping", "Fire stopping is safety-related."),
    ];
  }
  if (matchesAny(normalized, ["debris", "dust", "loading area", "waste", "roska", "pöly"])) {
    return [candidate("Environment", "medium", "site condition wording", "Site condition wording maps to Environment tag.")];
  }
  return [candidate("Quality", "medium", "defect or quality wording", "Default construction defect tag is Quality.")];
};

const candidate = <T,>(
  value: T,
  confidence: Phase4Candidate<T>["confidence"],
  evidence: string,
  reason: string,
): Phase4Candidate<T> => ({ value, confidence, evidence, reason });

const matchesAny = (normalized: string, needles: string[]) =>
  needles.some((needle) => normalized.includes(normalize(needle)));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/.,:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
