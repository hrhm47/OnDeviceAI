import type { SQLiteDatabase } from "expo-sqlite";

import {
  loadActiveProjectContext,
  type ProjectContextPackage,
} from "../context/activeProjectContextLoader";
import {
  preparePhase4RetrievalItemEmbeddings,
  type Phase4EmbeddingIndexProgress,
} from "../embeddings/phase4EmbeddingIndexer";
import { phase4EmbeddingGemmaProvider } from "../embeddings/phase4EmbeddingGemmaProvider";
import type { Phase4EmbeddingProvider } from "../embeddings/phase4EmbeddingProvider";
import { buildPhase4RetrievalItems } from "../retrieval/phase4RetrievalItems";
import type { Phase4RetrievalItem } from "../retrieval/phase4RetrievalTypes";
import {
  checkPhase4Fts5Support,
  importPhase4SeedBundle,
  initializePhase4HybridRagDatabase,
} from "./phase4HybridRagDb";
import {
  getPhase4EmbeddingVectorCount,
  getPhase4RetrievalItemCount,
  repairPhase4RetrievalItemsFtsIfNeeded,
  rebuildPhase4RetrievalItemsFts,
  upsertPhase4RetrievalItems,
} from "../retrieval/phase4RetrievalItemRepository";

export type Phase4EmbeddingMode = "skip" | "ifReady" | "requireReady";

export type Phase4HybridRagRuntime = {
  db: SQLiteDatabase;
  context: ProjectContextPackage;
  retrievalItems: Phase4RetrievalItem[];
  embeddingProvider: Phase4EmbeddingProvider | null;
  status: {
    preparedAt: string;
    userId: string;
    projectId: string;
    retrievalItemCount: number;
    ftsReady: boolean;
    embeddingModelReady: boolean;
    embeddingVectorCount: number;
    semanticReady: boolean;
    semanticStatusMessage: string;
    message: string;
  };
};

let cachedRuntime: Phase4HybridRagRuntime | null = null;
let cachedRuntimeKey: string | null = null;

export const preparePhase4HybridRagRuntime = async (input?: {
  userId?: string;
  forceRefresh?: boolean;
  embeddingMode?: Phase4EmbeddingMode;
  onEmbeddingProgress?: (progress: Phase4EmbeddingIndexProgress) => void;
}): Promise<Phase4HybridRagRuntime> => {
  const contextResult = loadActiveProjectContext({ userId: input?.userId });
  if (!contextResult.ok) {
    throw new Error(contextResult.errorMessage);
  }

  const embeddingMode = input?.embeddingMode ?? "ifReady";
  const embeddingReadiness =
    embeddingMode === "skip"
      ? {
          ready: false,
          modelUri: null,
          message: "Semantic retrieval skipped for this preparation.",
        }
      : await phase4EmbeddingGemmaProvider.getReadiness();
  const runtimeKey = [
    contextResult.context.activeUser.user_id,
    contextResult.context.project.project_id,
    "retrieval-items-v2",
    embeddingMode,
    embeddingReadiness.modelUri ?? "no-embedding-model",
  ].join(":");
  if (!input?.forceRefresh && cachedRuntime && cachedRuntimeKey === runtimeKey) {
    return cachedRuntime;
  }

  const db = await initializePhase4HybridRagDatabase();
  await importPhase4SeedBundle(db);
  let retrievalItems = buildPhase4RetrievalItems(contextResult.context);
  await upsertPhase4RetrievalItems(db, retrievalItems);
  const fts = await checkPhase4Fts5Support(db);
  if (fts.supported) {
    await repairPhase4RetrievalItemsFtsIfNeeded(db);
    await rebuildPhase4RetrievalItemsFts(db);
  }

  const retrievalItemCount = await getPhase4RetrievalItemCount(
    db,
    contextResult.context.project.project_id,
  );
  const embeddingStatus = await prepareEmbeddingStatus({
    db,
    projectId: contextResult.context.project.project_id,
    items: retrievalItems,
    mode: embeddingMode,
    modelReady: embeddingReadiness.ready,
    readinessMessage: embeddingReadiness.message,
    onProgress: input?.onEmbeddingProgress,
  });
  retrievalItems = embeddingStatus.items;
  cachedRuntime = {
    db,
    context: contextResult.context,
    retrievalItems,
    embeddingProvider: embeddingStatus.semanticReady
      ? phase4EmbeddingGemmaProvider
      : null,
    status: {
      preparedAt: new Date().toISOString(),
      userId: contextResult.context.activeUser.user_id,
      projectId: contextResult.context.project.project_id,
      retrievalItemCount,
      ftsReady: fts.supported,
      embeddingModelReady: embeddingStatus.modelReady,
      embeddingVectorCount: embeddingStatus.vectorCount,
      semanticReady: embeddingStatus.semanticReady,
      semanticStatusMessage: embeddingStatus.message,
      message: [
        fts.supported
          ? `Retrieval ready for ${contextResult.context.project.project_name}.`
          : `Retrieval prepared without FTS5: ${fts.message}`,
        embeddingStatus.message,
      ].join(" "),
    },
  };
  cachedRuntimeKey = runtimeKey;
  return cachedRuntime;
};

export const clearPhase4HybridRagRuntimeCache = () => {
  cachedRuntime = null;
  cachedRuntimeKey = null;
};

const prepareEmbeddingStatus = async (input: {
  db: SQLiteDatabase;
  projectId: string;
  items: Phase4RetrievalItem[];
  mode: Phase4EmbeddingMode;
  modelReady: boolean;
  readinessMessage: string;
  onProgress?: (progress: Phase4EmbeddingIndexProgress) => void;
}): Promise<{
  items: Phase4RetrievalItem[];
  modelReady: boolean;
  vectorCount: number;
  semanticReady: boolean;
  message: string;
}> => {
  const currentVectorCount = await getPhase4EmbeddingVectorCount(
    input.db,
    input.projectId,
  );
  if (input.mode === "skip") {
    return {
      items: input.items,
      modelReady: false,
      vectorCount: currentVectorCount,
      semanticReady: false,
      message: "Semantic retrieval skipped for deterministic preparation.",
    };
  }
  if (!input.modelReady) {
    if (input.mode === "requireReady") {
      throw new Error(input.readinessMessage);
    }
    return {
      items: input.items,
      modelReady: false,
      vectorCount: currentVectorCount,
      semanticReady: false,
      message: input.readinessMessage,
    };
  }

  try {
    const result = await preparePhase4RetrievalItemEmbeddings({
      db: input.db,
      projectId: input.projectId,
      items: input.items,
      embeddingProvider: phase4EmbeddingGemmaProvider,
      onProgress: input.onProgress,
    });
    return {
      items: result.items,
      modelReady: true,
      vectorCount: result.vectorCount,
      semanticReady: result.semanticReady,
      message: result.message,
    };
  } catch (error) {
    if (input.mode === "requireReady") {
      throw error;
    }
    return {
      items: input.items,
      modelReady: true,
      vectorCount: currentVectorCount,
      semanticReady: false,
      message: `Embedding model is present, but vector indexing failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};
