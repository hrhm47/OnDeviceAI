import type { SQLiteDatabase } from "expo-sqlite";

import type { Phase4EmbeddingProvider } from "../embeddings/phase4EmbeddingProvider";
import type { ProjectContextPackage } from "../context/activeProjectContextLoader";
import { matchAreaFromTranscript } from "../rag/area/exactAreaMatcher";
import {
  getBuildingCountForProject,
  getGeneratedAreasForProject,
} from "../rag/area/getGeneratedAreasForProject";
import type {
  Phase4AllowedDueDate,
  Phase4Candidate,
  Phase4CandidateConfidence,
  Phase4CompanyCandidate,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "../types/phase4.types";
import { findExactPhase4RetrievalHits } from "./phase4ExactMatcher";
import { searchPhase4LexicalRetrievalItems } from "./phase4LexicalRetriever";
import {
  rebuildPhase4RetrievalItemsFts,
  upsertPhase4RetrievalItems,
} from "./phase4RetrievalItemRepository";
import { buildPhase4RetrievalItems } from "./phase4RetrievalItems";
import type { Phase4RetrievalHit, Phase4RetrievalItem } from "./phase4RetrievalTypes";
import { searchPhase4SemanticRetrievalItems } from "./phase4SemanticRetriever";

export type Phase4HybridRetrievalResult = {
  areaCandidates: Phase4Candidate<string>[];
  companyCandidates: Phase4CompanyCandidate[];
  workTypeCandidates: Phase4Candidate<string>[];
  actionCandidates: Phase4Candidate<Phase4RequiredAction>[];
  tagCandidates: Phase4Candidate<Phase4TaskTag>[];
  dateCandidates: Phase4Candidate<Phase4AllowedDueDate>[];
  evidence: string[];
  warnings: string[];
  timings: {
    totalMs: number;
    exactMs: number;
    lexicalMs: number;
    semanticMs: number;
  };
  counts: {
    exact: number;
    lexical: number;
    semantic: number;
  };
};

export const retrievePhase4HybridContext = async (input: {
  transcript: string;
  context: ProjectContextPackage;
  db?: SQLiteDatabase | null;
  items?: Phase4RetrievalItem[];
  rebuildLexicalIndex?: boolean;
  embeddingProvider?: Phase4EmbeddingProvider | null;
}): Promise<Phase4HybridRetrievalResult> => {
  const startedAt = Date.now();
  const warnings: string[] = [];
  const items = input.items ?? buildPhase4RetrievalItems(input.context);

  const exactStartedAt = Date.now();
  const exactHits = findExactPhase4RetrievalHits({
    transcript: input.transcript,
    projectId: input.context.project.project_id,
    items,
  });
  const projectAreaExactHits = findProjectAreaExactHits({
    transcript: input.transcript,
    context: input.context,
    items,
  });
  const exactMs = Date.now() - exactStartedAt;

  const lexicalStartedAt = Date.now();
  const lexicalHits = input.db
    ? await runLexicalRetrieval(
        input.db,
        input.context.project.project_id,
        input.transcript,
        items,
        input.rebuildLexicalIndex ?? true,
        warnings,
      )
    : [];
  if (!input.db) {
    warnings.push("Lexical retrieval skipped because SQLite DB was not supplied.");
  }
  const lexicalMs = Date.now() - lexicalStartedAt;

  const semanticStartedAt = Date.now();
  const semanticResult = await searchPhase4SemanticRetrievalItems({
    transcript: input.transcript,
    projectId: input.context.project.project_id,
    items,
    embeddingProvider: input.embeddingProvider,
  });
  if (semanticResult.disabledReason) {
    warnings.push(semanticResult.disabledReason);
  }
  const semanticMs = Date.now() - semanticStartedAt;
  const hits = fuseHits([
    ...projectAreaExactHits,
    ...exactHits,
    ...lexicalHits,
    ...semanticResult.hits,
  ]);

  return {
    areaCandidates: candidatesForType(hits, "area", (hit) => hit.item.displayName),
    companyCandidates: companyCandidates(hits, input.context),
    workTypeCandidates: workTypeCandidates(hits),
    actionCandidates: candidatesForType(hits, "action", (hit) => hit.item.displayName as Phase4RequiredAction),
    tagCandidates: candidatesForType(hits, "tag", (hit) => hit.item.displayName as Phase4TaskTag),
    dateCandidates: candidatesForType(hits, "date_hint", (hit) => hit.item.displayName as Phase4AllowedDueDate),
    evidence: hits.map((hit) => `${hit.matchType}: ${hit.item.displayName} (${hit.evidence})`),
    warnings,
    timings: {
      totalMs: Date.now() - startedAt,
      exactMs,
      lexicalMs,
      semanticMs,
    },
    counts: {
      exact: exactHits.length + projectAreaExactHits.length,
      lexical: lexicalHits.length,
      semantic: semanticResult.hits.length,
    },
  };
};

const findProjectAreaExactHits = (input: {
  transcript: string;
  context: ProjectContextPackage;
  items: Phase4RetrievalItem[];
}): Phase4RetrievalHit[] => {
  const projectId = input.context.project.project_id;
  const exactArea = matchAreaFromTranscript({
    transcript: input.transcript,
    generatedAreas: getGeneratedAreasForProject(projectId),
    projectBuildingCount: getBuildingCountForProject(projectId),
    userDefaultBuildingId: defaultBuildingId(input.context),
  });
  return exactArea.areaCandidates.flatMap((area) => {
    const item = input.items.find(
      (candidate) =>
        candidate.projectId === projectId &&
        candidate.itemType === "area" &&
        candidate.sourceId === area.areaId,
    );
    return item
      ? [
          {
            item,
            score: exactAreaScore(area.confidence),
            matchType: "exact" as const,
            evidence: area.evidence.join("; "),
          },
        ]
      : [];
  });
};

const defaultBuildingId = (context: ProjectContextPackage) => {
  const defaultArea = context.activeUser.default_area_id
    ? context.areas.find((area) => area.area_id === context.activeUser.default_area_id)
    : null;
  if (!defaultArea?.building_name) {
    return null;
  }

  return getGeneratedAreasForProject(context.project.project_id).find(
    (area) => area.buildingName === defaultArea.building_name,
  )?.buildingId ?? null;
};

const exactAreaScore = (confidence: Phase4CandidateConfidence) => {
  if (confidence === "high") {
    return 185;
  }
  if (confidence === "medium") {
    return 95;
  }
  return 25;
};

const runLexicalRetrieval = async (
  db: SQLiteDatabase,
  projectId: string,
  transcript: string,
  items: ReturnType<typeof buildPhase4RetrievalItems>,
  rebuildLexicalIndex: boolean,
  warnings: string[],
) => {
  try {
    if (rebuildLexicalIndex) {
      await upsertPhase4RetrievalItems(db, items);
      await rebuildPhase4RetrievalItemsFts(db);
    }
    return searchPhase4LexicalRetrievalItems({ db, projectId, transcript });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
    return [];
  }
};

const fuseHits = (hits: Phase4RetrievalHit[]) => {
  const byItemId = new Map<string, Phase4RetrievalHit>();
  for (const hit of hits) {
    const existing = byItemId.get(hit.item.itemId);
    if (!existing || hit.score > existing.score) {
      byItemId.set(hit.item.itemId, hit);
    }
  }
  return Array.from(byItemId.values()).sort((first, second) => second.score - first.score);
};

const candidatesForType = <T,>(
  hits: Phase4RetrievalHit[],
  itemType: Phase4RetrievalHit["item"]["itemType"],
  value: (hit: Phase4RetrievalHit) => T,
): Phase4Candidate<T>[] =>
  hits
    .filter((hit) => hit.item.itemType === itemType)
    .map((hit) => ({
      value: value(hit),
      confidence: confidenceFromScore(hit.score),
      evidence: hit.evidence,
      reason: `${hit.matchType} retrieval matched ${hit.item.displayName}.`,
      id: candidateId(hit),
      label: hit.item.displayName,
      matchType: hit.matchType,
      score: hit.score,
    }))
    .slice(0, 5);

const workTypeCandidates = (
  hits: Phase4RetrievalHit[],
): Phase4Candidate<string>[] => {
  const byWorkType = new Map<string, Phase4Candidate<string> & { score: number }>();
  for (const hit of hits) {
    const workType =
      hit.item.itemType === "company_context" || hit.item.itemType === "work_type"
        ? stringValue(hit.item.metadata.workTypeCode) ?? hit.item.sourceId
        : null;
    if (!workType) {
      continue;
    }
    const contextBoost = hit.item.itemType === "company_context" ? 18 : 0;
    const score = hit.score + contextBoost;
    const existing = byWorkType.get(workType);
    if (existing && existing.score >= score) {
      continue;
    }
    byWorkType.set(workType, {
      value: workType,
      confidence: confidenceFromScore(score),
      evidence: hit.evidence,
      reason:
        hit.item.itemType === "company_context"
          ? `${hit.matchType} retrieval matched project company scope for ${workType}.`
          : `${hit.matchType} retrieval matched ${hit.item.displayName}.`,
      score,
      id: workType,
      label: workType,
      matchType: hit.matchType,
    });
  }
  return Array.from(byWorkType.values())
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(({ score: _score, ...candidate }) => candidate);
};

const companyCandidates = (
  hits: Phase4RetrievalHit[],
  context: ProjectContextPackage,
): Phase4CompanyCandidate[] =>
  dedupeHitsBySourceId(hits)
    .filter((hit) => hit.item.itemType === "company_context")
    .flatMap((hit) => {
      const allowedCompany = context.referenceData.companies.find(
        (company) => company.displayName === hit.item.displayName,
      );
      if (!allowedCompany) {
        return [];
      }
      return [{
        value: {
          companyId: allowedCompany.companyId,
          displayName: allowedCompany.displayName,
        },
        confidence: confidenceFromScore(hit.score),
        evidence: hit.evidence,
        reason: `${hit.matchType} retrieval matched project company context.`,
        id: allowedCompany.companyId,
        label: allowedCompany.displayName,
        matchType: hit.matchType,
        score: hit.score,
      }];
    })
    .slice(0, 5);

const dedupeHitsBySourceId = (hits: Phase4RetrievalHit[]) => {
  const bySourceId = new Map<string, Phase4RetrievalHit>();
  for (const hit of hits) {
    const key = `${hit.item.itemType}:${hit.item.sourceId}`;
    const existing = bySourceId.get(key);
    if (!existing || existing.score < hit.score) {
      bySourceId.set(key, hit);
    }
  }
  return Array.from(bySourceId.values()).sort(
    (first, second) => second.score - first.score,
  );
};

const confidenceFromScore = (score: number): Phase4CandidateConfidence => {
  if (score >= 80) {
    return "high";
  }
  if (score >= 30) {
    return "medium";
  }
  return "low";
};

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const candidateId = (hit: Phase4RetrievalHit) => {
  if (hit.item.itemType === "action") {
    return actionCode(hit.item.displayName);
  }
  if (hit.item.itemType === "date_hint") {
    return dueDateCode(hit.item.displayName);
  }
  if (hit.item.itemType === "tag") {
    return tagCode(hit.item.displayName);
  }
  return hit.item.sourceId;
};

const actionCode = (displayName: string) => {
  if (displayName === "Korjaus" || displayName === "Fixed") return "repair";
  if (displayName === "Maalataan uudestaan" || displayName === "Maalataan") {
    return "repaint";
  }
  if (displayName === "Kittaus ja maalaus") return "seal";
  if (displayName === "Kuntoon") return "complete";
  return displayName.toLowerCase().replace(/\s+/g, "_");
};

const dueDateCode = (displayName: string) => {
  if (displayName === "Now") return "now";
  if (displayName === "+3 days") return "plus_3_days";
  if (displayName === "+7 days") return "plus_7_days";
  return displayName.toLowerCase().replace(/\s+/g, "_");
};

const tagCode = (displayName: string) =>
  displayName.toLowerCase().replace(/\s+/g, "_");
