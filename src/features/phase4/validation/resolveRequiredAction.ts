import { normalizeText } from "../rag/area/exactAreaMatcher";
import type { Phase4Confidence, Phase4FieldStatus, Phase4RequiredAction } from "../types/phase4.types";

export type ResolvedActionField = {
  code: string | null;
  value: Phase4RequiredAction | null;
  status: Phase4FieldStatus;
  confidence: Phase4Confidence;
  reason: string;
};

const ACTION_ALIASES = [
  {
    code: "repair",
    displayName: "Korjaus" as const,
    aliases: [
      "fix",
      "fixed",
      "repair",
      "needs to be fixed",
      "should be fixed",
      "korjaa",
      "korjaus",
    ],
  },
  {
    code: "repaint",
    displayName: "Maalataan uudestaan" as const,
    aliases: [
      "repaint",
      "paint again",
      "paint damage",
      "wall scratch",
      "maalataan uudestaan",
      "maalivaurio",
    ],
  },
  {
    code: "seal",
    displayName: "Kittaus ja maalaus" as const,
    aliases: [
      "seal",
      "silicone",
      "caulk",
      "missing silicone",
      "kittaus",
      "silikoni",
    ],
  },
];

export function resolveRequiredAction(input: {
  transcript: string;
  llmActionCode?: string | null;
  actionCandidates?: { id: string; label: string; confidence?: string }[];
}): ResolvedActionField {
  if (input.llmActionCode) {
    const candidate = input.actionCandidates?.find(
      (action) => action.id === input.llmActionCode,
    );
    if (candidate) {
      return {
        code: candidate.id,
        value: canonicalActionValue(candidate.id, candidate.label),
        status: "suggested",
        confidence: confidence(candidate.confidence),
        reason: "Action selected from retrieved candidate ID.",
      };
    }
  }

  const normalized = normalizeText(input.transcript);
  for (const action of ACTION_ALIASES) {
    if (
      action.aliases.some((alias) =>
        normalized.includes(normalizeText(alias)),
      )
    ) {
      return {
        code: action.code,
        value: action.displayName,
        status: "suggested",
        confidence: "high",
        reason: `Action matched transcript alias for ${action.code}.`,
      };
    }
  }

  const topCandidate = input.actionCandidates?.[0];
  if (topCandidate) {
    return {
      code: topCandidate.id,
      value: canonicalActionValue(topCandidate.id, topCandidate.label),
      status: "suggested",
      confidence: "low",
      reason: "Action selected from top retrieval candidate.",
    };
  }

  return {
    code: null,
    value: null,
    status: "manual_required",
    confidence: "none",
    reason: "No safe required action found.",
  };
}

const confidence = (value: string | undefined): Phase4Confidence =>
  value === "high" || value === "medium" || value === "low" ? value : "medium";

const canonicalActionValue = (
  code: string,
  fallbackLabel: string,
): Phase4RequiredAction | null => {
  if (code === "repair") {
    return "Korjaus";
  }
  if (code === "repaint") {
    return "Maalataan uudestaan";
  }
  if (code === "seal") {
    return "Kittaus ja maalaus";
  }
  return toRequiredAction(fallbackLabel);
};

const toRequiredAction = (value: string): Phase4RequiredAction | null => {
  const allowed: Phase4RequiredAction[] = [
    "Fixed",
    "Hionta",
    "Kiinnitetään kunnolla",
    "Kittaus ja maalaus",
    "Korjaus",
    "Kuntoon",
    "Maalataan",
    "Maalataan uudestaan",
  ];
  return allowed.includes(value as Phase4RequiredAction)
    ? (value as Phase4RequiredAction)
    : null;
};
