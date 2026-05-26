import type { SQLiteDatabase } from "expo-sqlite";

import {
  getPhase4EmbeddingVectorCount,
  getPhase4RetrievalItemsByProject,
  upsertPhase4RetrievalItems,
} from "../retrieval/phase4RetrievalItemRepository";
import type { Phase4RetrievalItem } from "../retrieval/phase4RetrievalTypes";
import type { Phase4EmbeddingProvider } from "./phase4EmbeddingProvider";

export type Phase4EmbeddingIndexProgress = {
  completed: number;
  total: number;
  itemId: string;
};

export type Phase4EmbeddingIndexResult = {
  items: Phase4RetrievalItem[];
  vectorCount: number;
  semanticReady: boolean;
  message: string;
};

export const preparePhase4RetrievalItemEmbeddings = async (input: {
  db: SQLiteDatabase;
  projectId: string;
  items: Phase4RetrievalItem[];
  embeddingProvider: Phase4EmbeddingProvider;
  onProgress?: (progress: Phase4EmbeddingIndexProgress) => void;
}): Promise<Phase4EmbeddingIndexResult> => {
  const existingItems = await getPhase4RetrievalItemsByProject(
    input.db,
    input.projectId,
  );
  const existingById = new Map(existingItems.map((item) => [item.itemId, item]));
  const existingVectorCount = existingItems.filter(
    (item) => item.embeddingVector?.length,
  ).length;
  const missingItems = input.items
    .map((item) => existingById.get(item.itemId) ?? item)
    .filter((item) => item.projectId === input.projectId && !item.embeddingVector?.length);

  if (!missingItems.length) {
    return {
      items: mergeVectorItems(input.items, existingById),
      vectorCount: existingVectorCount,
      semanticReady: existingVectorCount > 0,
      message: existingVectorCount
        ? `Semantic retrieval ready with ${existingVectorCount} vectors.`
        : "Embedding model is ready, but no retrieval items need vectors.",
    };
  }

  let completed = existingVectorCount;
  const total = input.items.filter((item) => item.projectId === input.projectId).length;

  for (const item of missingItems) {
    const embeddingVector = await input.embeddingProvider.embedDocument(
      buildEmbeddingDocumentText(item),
    );
    await upsertPhase4RetrievalItems(input.db, [{ ...item, embeddingVector }]);
    completed += 1;
    input.onProgress?.({ completed, total, itemId: item.itemId });
  }

  const vectorCount = await getPhase4EmbeddingVectorCount(input.db, input.projectId);
  const vectorizedItems = await getPhase4RetrievalItemsByProject(
    input.db,
    input.projectId,
  );
  return {
    items: mergeVectorItems(input.items, new Map(vectorizedItems.map((item) => [item.itemId, item]))),
    vectorCount,
    semanticReady: vectorCount > 0,
    message: vectorCount
      ? `Semantic retrieval ready with ${vectorCount} vectors.`
      : "Embedding model is ready, but no vectors were stored.",
  };
};

const mergeVectorItems = (
  sourceItems: Phase4RetrievalItem[],
  storedById: Map<string, Phase4RetrievalItem>,
) =>
  sourceItems.map((item) => ({
    ...item,
    embeddingVector: storedById.get(item.itemId)?.embeddingVector ?? item.embeddingVector,
  }));

const buildEmbeddingDocumentText = (item: Phase4RetrievalItem) =>
  [
    `type: ${item.itemType}`,
    `name: ${item.displayName}`,
    `aliases: ${item.exactAliases.join("; ")}`,
    `search: ${item.searchText}`,
    `metadata: ${JSON.stringify(item.metadata)}`,
  ].join("\n");
