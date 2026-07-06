
// export const TASK_TAGS_V1: readonly Phase4TaskTag[] = [
//   "Environment",
//   "Health",
//   "Induction",
//   "Palokatko",
//   "Quality",
//   "Safety",
// ] as const;


export const TASK_TAG_CODES_V1 = [
  "tag_environment",
  "tag_health",
  "tag_induction",
  "tag_fire_stopping",
  "tag_quality",
  "tag_safety",
] as const;

export const TASK_TAG_LABELS_V1 = [
  "Environment",
  "Health",
  "Induction",
  "Palokatko",
  "Quality",
  "Safety",
] as const;

export const TASK_TAGS_V1 = [
  {
    id: "tag_environment",
    label: "Environment",
  },
  {
    id: "tag_health",
    label: "Health",
  },
  {
    id: "tag_induction",
    label: "Induction",
  },
  {
    id: "tag_fire_stopping",
    label: "Fire stopping",
  },
  {
    id: "tag_quality",
    label: "Quality",
  },
  {
    id: "tag_safety",
    label: "Safety",
  },
] as const;
