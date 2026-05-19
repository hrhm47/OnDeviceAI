import type { Phase4GeneralTaskFormSchema } from "../types/phase4.types";
import { DUE_DATE_OPTIONS_V1 } from "./dueDates.v1";
import { REQUIRED_ACTION_OPTIONS_V1 } from "./requiredActions.v1";
import { TASK_TAGS_V1 } from "./tags.v1";

export const GENERAL_TASK_FORM_V1: Phase4GeneralTaskFormSchema = {
  formId: "general_task_form",
  schemaVersion: "v1",
  displayName: "General Task Form",
  defaultList: "Hallo",
  allowedAreaOptions: ["Kortermaja 1", "Kortermaja 2", "Kortermaja 3"],
  fields: [
    { fieldId: "list", handling: 'default "Hallo"' },
    { fieldId: "company", handling: "allowed company database only" },
    { fieldId: "description", handling: "extract from transcript" },
    { fieldId: "area", handling: "spoken allowed area only", allowedValues: ["Kortermaja 1", "Kortermaja 2", "Kortermaja 3"] },
    { fieldId: "marker", handling: "manual only" },
    { fieldId: "photos", handling: "skipped" },
    { fieldId: "requiredAction", handling: "allowed actions only", allowedValues: REQUIRED_ACTION_OPTIONS_V1 },
    { fieldId: "requiredActionDueDate", handling: "allowed due dates only", allowedValues: DUE_DATE_OPTIONS_V1 },
    { fieldId: "tags", handling: "allowed tags only", allowedValues: TASK_TAGS_V1 },
    { fieldId: "impacts", handling: "not configured" },
    { fieldId: "notifications", handling: "default false" },
  ],
} as const;
