import type { Phase4EmbeddingProvider } from "../embeddings/phase4EmbeddingProvider";
import { cosineSimilarity } from "../embeddings/phase4VectorMath";
import type { Phase4RetrievalHit, Phase4RetrievalItem } from "./phase4RetrievalTypes";

export type Phase4SemanticRetrievalResult = {
  enabled: boolean;
  disabledReason: string | null;
  hits: Phase4RetrievalHit[];
};

export const searchPhase4SemanticRetrievalItems = async (input: {
  transcript: string;
  projectId: string;
  items: Phase4RetrievalItem[];
  embeddingProvider?: Phase4EmbeddingProvider | null;
  limit?: number;
}): Promise<Phase4SemanticRetrievalResult> => {
  if (!input.embeddingProvider) {
    return disabled("Semantic retrieval is disabled because no embedding provider was supplied.");
  }

  const vectorItems = input.items.filter(
    (item) => item.projectId === input.projectId && item.embeddingVector?.length,
  );
  if (!vectorItems.length) {
    return disabled("Semantic retrieval is disabled because no retrieval item vectors exist.");
  }

  const readiness = await input.embeddingProvider.getReadiness();
  if (!readiness.ready) {
    return disabled(readiness.message);
  }

  const queryVector = await input.embeddingProvider.embedQuery(input.transcript);
  const hits = vectorItems
    .map((item): Phase4RetrievalHit => ({
      item,
      score: cosineSimilarity(queryVector, item.embeddingVector ?? []),
      matchType: "semantic",
      evidence: input.embeddingProvider?.modelId ?? "semantic vector",
    }))
    .filter((hit) => hit.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, input.limit ?? 20);

  return { enabled: true, disabledReason: null, hits };
};

const disabled = (reason: string): Phase4SemanticRetrievalResult => ({
  enabled: false,
  disabledReason: reason,
  hits: [],
});
