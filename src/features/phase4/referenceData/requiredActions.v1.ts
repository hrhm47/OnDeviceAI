import type { Phase4RequiredAction } from "../types/phase4.types";

export const REQUIRED_ACTION_OPTIONS_V1: readonly Phase4RequiredAction[] = [
  "Fixed",
  "Hionta",
  "Kiinnitetään kunnolla",
  "Kittaus ja maalaus",
  "Korjaus",
  "Kuntoon",
  "Maalataan",
  "Maalataan uudestaan",
] as const;
