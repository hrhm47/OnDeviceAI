export type Phase4RetrievalItemType =
  | "area"
  | "company_context"
  | "work_type"
  | "action"
  | "tag"
  | "date_hint";

export type Phase4RetrievalItem = {
  itemId: string;
  projectId: string;
  itemType: Phase4RetrievalItemType;
  sourceTable: string;
  sourceId: string;
  displayName: string;
  exactAliases: string[];
  searchText: string;
  metadata: Record<string, unknown>;
  embeddingVector?: number[];
};
