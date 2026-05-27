import { normalizeText } from "../rag/area/exactAreaMatcher";
import type { Phase4Confidence, Phase4FieldStatus, Phase4TaskTag } from "../types/phase4.types";

export type ResolvedTagsField = {
  value: Phase4TaskTag[];
  tagCodes: string[];
  status: Phase4FieldStatus;
  confidence: Phase4Confidence;
  reason: string;
};

const TAG_ALIASES: { code: string; value: Phase4TaskTag; aliases: string[] }[] = [
  {
    code: "quality",
    value: "Quality",
    aliases: ["quality", "defect", "inspection", "laatu", "virhe"],
  },
  {
    code: "safety",
    value: "Safety",
    aliases: ["safety", "danger", "hazard", "urgent safety", "turvallisuus", "vaara"],
  },
  {
    code: "palokatko",
    value: "Palokatko",
    aliases: ["palokatko", "fire stop", "fire stopping"],
  },
];

export function resolveTags(input: {
  transcript: string;
  llmTagCodes?: string[] | null;
  tagCandidates?: { id: string; label: string; confidence?: string }[];
}): ResolvedTagsField {
  const selected: { code: string; value: Phase4TaskTag }[] = [];

  for (const code of input.llmTagCodes ?? []) {
    const candidate = input.tagCandidates?.find((tag) => tag.id === code);
    const value = toAllowedTag(candidate?.label);
    if (candidate && value && !selected.some((tag) => tag.code === candidate.id)) {
      selected.push({ code: candidate.id, value });
    }
  }

  const normalized = normalizeText(input.transcript);
  for (const tag of TAG_ALIASES) {
    if (
      tag.aliases.some((alias) =>
        normalized.includes(normalizeText(alias)),
      ) &&
      !selected.some((selectedTag) => selectedTag.code === tag.code)
    ) {
      selected.push({ code: tag.code, value: tag.value });
    }
  }

  if (selected.length > 0) {
    return {
      value: selected.map((tag) => tag.value),
      tagCodes: selected.map((tag) => tag.code),
      status: "suggested",
      confidence: "high",
      reason: "Tags matched transcript or retrieved candidates.",
    };
  }

  if ((input.tagCandidates?.length ?? 0) > 0) {
    return {
      value: [],
      tagCodes: [],
      status: "selection_required",
      confidence: input.tagCandidates?.some((tag) => tag.confidence === "high")
        ? "high"
        : "medium",
      reason: "Retrieved tag candidates are available; select any applicable tags.",
    };
  }

  return {
    value: [],
    tagCodes: [],
    status: "manual_required",
    confidence: "none",
    reason: "No tag evidence found.",
  };
}

const toAllowedTag = (value: string | undefined): Phase4TaskTag | null => {
  const allowed = ["Environment", "Health", "Induction", "Palokatko", "Quality", "Safety"];
  return allowed.includes(value ?? "") ? (value as Phase4TaskTag) : null;
};
