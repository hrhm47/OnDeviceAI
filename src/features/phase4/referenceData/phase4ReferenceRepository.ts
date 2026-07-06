import type { Phase4ReferenceData } from "../types/phase4.types";
import { DUE_DATE_OPTIONS_V1 } from "./dueDates.v1";
import { PHASE4_EXTRACTION_POLICY_V1 } from "./extractionPolicy.v1";
import { GENERAL_TASK_FORM_V1 } from "./generalTaskForm.v1";
import { REQUIRED_ACTION_OPTIONS_V1 } from "./requiredActions.v1";
import { TASK_TAG_LABELS_V1 } from "./tags.v1";

export function getPhase4ReferenceData(): Phase4ReferenceData {
  return {
    formSchema: GENERAL_TASK_FORM_V1,
    companies: [],
    tags: TASK_TAG_LABELS_V1,
    requiredActions: REQUIRED_ACTION_OPTIONS_V1,
    dueDates: DUE_DATE_OPTIONS_V1,
    extractionPolicy: PHASE4_EXTRACTION_POLICY_V1,
  };
}
