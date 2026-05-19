import type { Phase4ExtractionPolicy } from "../types/phase4.types";

export const PHASE4_EXTRACTION_POLICY_V1: Phase4ExtractionPolicy = {
  policyVersion: "phase4_extraction_policy_v1",
  rules: [
    "Use only values from the local Phase 4 reference data.",
    "Do not invent companies, company IDs, tags, required actions, due dates, or areas.",
    "Default list to Hallo.",
    "Fill area only when an allowed area option is spoken.",
    "Marker is manual only.",
    "Photos are skipped.",
    "Impacts are not configured.",
    "Notifications default to false.",
    "The validator decides whether LLM suggestions are safe.",
  ],
} as const;
