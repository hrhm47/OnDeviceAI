import type { SQLiteDatabase } from "expo-sqlite";

import {
  loadActiveProjectContext,
  type ProjectContextPackage,
} from "../context/activeProjectContextLoader";
import { buildPhase4RetrievalItems } from "../retrieval/phase4RetrievalItems";
import type { Phase4RetrievalItem } from "../retrieval/phase4RetrievalTypes";
import {
  checkPhase4Fts5Support,
  importPhase4SeedBundle,
  initializePhase4HybridRagDatabase,
} from "./phase4HybridRagDb";
import {
  getPhase4RetrievalItemCount,
  rebuildPhase4RetrievalItemsFts,
  upsertPhase4RetrievalItems,
} from "../retrieval/phase4RetrievalItemRepository";

export type Phase4HybridRagRuntime = {
  db: SQLiteDatabase;
  context: ProjectContextPackage;
  retrievalItems: Phase4RetrievalItem[];
  status: {
    preparedAt: string;
    userId: string;
    projectId: string;
    retrievalItemCount: number;
    ftsReady: boolean;
    message: string;
  };
};

let cachedRuntime: Phase4HybridRagRuntime | null = null;
let cachedRuntimeKey: string | null = null;

export const preparePhase4HybridRagRuntime = async (input?: {
  userId?: string;
  forceRefresh?: boolean;
}): Promise<Phase4HybridRagRuntime> => {
  const contextResult = loadActiveProjectContext({ userId: input?.userId });
  if (!contextResult.ok) {
    throw new Error(contextResult.errorMessage);
  }

  const runtimeKey = `${contextResult.context.activeUser.user_id}:${contextResult.context.project.project_id}`;
  if (!input?.forceRefresh && cachedRuntime && cachedRuntimeKey === runtimeKey) {
    return cachedRuntime;
  }

  const db = await initializePhase4HybridRagDatabase();
  await importPhase4SeedBundle(db);
  const retrievalItems = buildPhase4RetrievalItems(contextResult.context);
  await upsertPhase4RetrievalItems(db, retrievalItems);
  const fts = await checkPhase4Fts5Support(db);
  if (fts.supported) {
    await rebuildPhase4RetrievalItemsFts(db);
  }

  const retrievalItemCount = await getPhase4RetrievalItemCount(
    db,
    contextResult.context.project.project_id,
  );
  cachedRuntime = {
    db,
    context: contextResult.context,
    retrievalItems,
    status: {
      preparedAt: new Date().toISOString(),
      userId: contextResult.context.activeUser.user_id,
      projectId: contextResult.context.project.project_id,
      retrievalItemCount,
      ftsReady: fts.supported,
      message: fts.supported
        ? `Retrieval ready for ${contextResult.context.project.project_name}.`
        : `Retrieval prepared without FTS5: ${fts.message}`,
    },
  };
  cachedRuntimeKey = runtimeKey;
  return cachedRuntime;
};

export const clearPhase4HybridRagRuntimeCache = () => {
  cachedRuntime = null;
  cachedRuntimeKey = null;
};
