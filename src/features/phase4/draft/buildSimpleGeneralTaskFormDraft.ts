import { REQUIRED_ACTION_OPTIONS_V1 } from "../referenceData/workActions";
import { TASK_TAGS_V1 } from "../referenceData/tags.v1";
import type {
  ConstructionExtraction,
  ConstructionResolution,
} from "../retrieval/misteralStructuralData";

export type FormSelection = {
  id: string;
  label: string;
};

export type SimpleGeneralTaskFormDraft = {
  list: FormSelection;
  company: {
    selected: FormSelection | null;
    suggestions: FormSelection[];
  };
  description: string;
  area: FormSelection | null;
  marker: null;
  photos: [];
  requiredAction: FormSelection | null;
  requiredActionDueDate: string | null;
  tags: FormSelection[];
  impacts: null;
  notifications: false;
};

export const buildSimpleGeneralTaskFormDraft = (input: {
  extraction: ConstructionExtraction;
  resolution: ConstructionResolution;
}): SimpleGeneralTaskFormDraft => {
  const companySuggestions = input.resolution.companies.map((company) => ({
    id: company.companyId,
    label: company.companyName,
  }));

  return {
    list: { id: "hallo", label: "Hallo" },
    company: {
      selected:
        companySuggestions.length === 1 ? companySuggestions[0] : null,
      suggestions: companySuggestions,
    },
    description: input.extraction.issue.trim(),
    area: buildAreaSelection(input.resolution),
    marker: null,
    photos: [],
    requiredAction: findSelectionById(
      REQUIRED_ACTION_OPTIONS_V1,
      input.extraction.requiredAction,
    ),
    requiredActionDueDate: input.extraction.timeframe,
    tags: validUniqueSelections(TASK_TAGS_V1, input.extraction.tags),
    impacts: null,
    notifications: false,
  };
};

const buildAreaSelection = (
  resolution: ConstructionResolution,
): FormSelection | null => {
  const { location } = resolution;
  if (
    !location.building ||
    location.status === "selection_required" ||
    location.status === "conflict" ||
    location.status === "not_found"
  ) {
    return null;
  }

  const parts = [location.building.building_name];
  let id = location.building.building_id;

  if (location.floor) {
    parts.push(location.floor.level_label);
    id = location.floor.level_id;
  }

  if (location.apartment) {
    parts.push(`Apartment ${location.apartment.apartment_number}`);
    id = location.apartment.apartment_id;
  }

  if (location.space) {
    parts.push(location.space.display_name);
    id = location.space.space_id;
  }

  return {
    id,
    label: parts.join(" / "),
  };
};

const findSelectionById = <T extends FormSelection>(
  options: readonly T[],
  id: string | null,
): FormSelection | null => {
  if (!id) {
    return null;
  }
  return options.find((option) => option.id === id) ?? null;
};

const validUniqueSelections = <T extends FormSelection>(
  options: readonly T[],
  ids: string[],
): FormSelection[] => {
  const seen = new Set<string>();
  return ids.flatMap((id) => {
    if (seen.has(id)) {
      return [];
    }
    const option = options.find((candidate) => candidate.id === id);
    if (!option) {
      return [];
    }
    seen.add(id);
    return [option];
  });
};
