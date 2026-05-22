import type { Phase4AllowedDueDate } from "../types/phase4.types";

export const DUE_DATE_OPTIONS_V1: readonly Phase4AllowedDueDate[] = [
  "Now",
  "+3 days",
  "+7 days",
] as const;
