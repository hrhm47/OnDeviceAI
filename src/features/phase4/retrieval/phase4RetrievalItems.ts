import type { ProjectContextPackage } from "../context/activeProjectContextLoader";
import type { Phase4DerivedArea } from "../data/phase4DerivedAreas";
import type { Phase4SeedWorkType } from "../data/phase4SeedData";
import type { Phase4RetrievalItem } from "./phase4RetrievalTypes";

export const buildPhase4RetrievalItems = (
  context: ProjectContextPackage,
): Phase4RetrievalItem[] => [
  ...context.areas.map((area) => areaRetrievalItem(area, context.project.project_id)),
  ...context.projectCompanyContext.flatMap((projectContext) => {
    const company = context.companies.find(
      (item) => item.company_id === projectContext.company_id,
    );
    if (!company) {
      return [];
    }

    const workTypes = workTypesForIds(
      context.workTypes,
      projectContext.work_type_ids ?? company.general_capability_work_type_ids ?? [],
    );
    const workTypeTerms = workTypes.flatMap(workTypeTermsForSearch);
    const workTypeIds = workTypes.map((workType) => workType.work_type_id);
    const aliases = uniqueCompact([
      company.company_name,
      company.company_type,
      projectContext.project_role,
      ...workTypeIds,
      ...workTypes.map((workType) => workType.name),
      ...workTypes.flatMap((workType) => workType.aliases_en ?? []),
    ]);
    const item: Phase4RetrievalItem = {
      itemId: `company_context:${projectContext.context_id}`,
      projectId: context.project.project_id,
      itemType: "company_context",
      sourceTable: "project_company_contexts",
      sourceId: projectContext.context_id,
      displayName: company.company_name,
      exactAliases: aliases,
      searchText: uniqueCompact([
        ...aliases,
        company.company_description,
        projectContext.responsibility_description,
        projectContext.scope_notes,
        projectContext.level_scope?.scope_description,
        projectContext.apartment_scope?.scope_description,
        projectContext.space_type_scope?.scope_description,
        ...(projectContext.space_type_scope?.space_types ?? []),
        ...workTypeTerms,
      ]).join(" "),
      metadata: {
        companyId: company.company_id,
        workTypeCode: workTypeIds[0] ?? null,
        workTypeIds,
        projectRole: projectContext.project_role,
        buildingIds: projectContext.building_ids ?? [],
        siteIds: projectContext.site_ids ?? [],
        levelScope: projectContext.level_scope ?? null,
        apartmentScope: projectContext.apartment_scope ?? null,
        spaceTypeScope: projectContext.space_type_scope ?? null,
      },
    };
    return [item];
  }),
  ...context.workTypes.map((workType): Phase4RetrievalItem => {
    const terms = workTypeTermsForSearch(workType);
    return {
      itemId: `work_type:${context.project.project_id}:${workType.work_type_id}`,
      projectId: context.project.project_id,
      itemType: "work_type",
      sourceTable: "work_types",
      sourceId: workType.work_type_id,
      displayName: workType.name,
      exactAliases: terms,
      searchText: terms.join(" "),
      metadata: { workTypeCode: workType.work_type_id },
    };
  }),
  ...context.referenceData.requiredActions.map((action): Phase4RetrievalItem => ({
    itemId: `action:${context.project.project_id}:${action}`,
    projectId: context.project.project_id,
    itemType: "action",
    sourceTable: "required_actions",
    sourceId: action,
    displayName: action,
    exactAliases: actionAliases[action] ?? [action],
    searchText: compact([action, ...(actionAliases[action] ?? [])]).join(" "),
    metadata: {},
  })),
  ...context.referenceData.tags.map((tag): Phase4RetrievalItem => ({
    itemId: `tag:${context.project.project_id}:${tag}`,
    projectId: context.project.project_id,
    itemType: "tag",
    sourceTable: "tags",
    sourceId: tag,
    displayName: tag,
    exactAliases: tagAliases[tag] ?? [tag],
    searchText: compact([tag, ...(tagAliases[tag] ?? [])]).join(" "),
    metadata: {},
  })),
  ...context.referenceData.dueDates.map((dueDate): Phase4RetrievalItem => ({
    itemId: `date_hint:${context.project.project_id}:${dueDate}`,
    projectId: context.project.project_id,
    itemType: "date_hint",
    sourceTable: "due_dates",
    sourceId: dueDate,
    displayName: dueDate,
    exactAliases: dueDateAliases[dueDate] ?? [dueDate],
    searchText: compact([dueDate, ...(dueDateAliases[dueDate] ?? [])]).join(" "),
    metadata: {},
  })),
];

const areaRetrievalItem = (
  area: Phase4DerivedArea,
  projectId: string,
): Phase4RetrievalItem => {
  const strongAliases = compact([
    area.area_label,
    ...(area.spoken_location_examples ?? []),
  ]);
  const weakAliases = compact([area.building_name, area.floor_or_zone]);
  const aliases = Array.from(new Set([...strongAliases, ...weakAliases]));
  return {
    itemId: `area:${area.area_id}`,
    projectId,
    itemType: "area",
    sourceTable: area.sourceTable,
    sourceId: area.sourceId,
    displayName: area.area_label,
    exactAliases: aliases,
    searchText: compact([...aliases, area.area_type, area.area_note]).join(" "),
    metadata: {
      areaId: area.area_id,
      projectId: area.project_id,
      buildingId: area.building_id,
      buildingName: area.building_name,
      floorOrZone: area.floor_or_zone,
      areaType: area.area_type,
      parentAreaId: area.parent_area_id,
      strongAliases,
      weakAliases,
      specificity: areaSpecificity(area.area_type, area.area_label),
    },
  };
};

const workTypesForIds = (workTypes: Phase4SeedWorkType[], workTypeIds: string[]) =>
  workTypeIds
    .map((workTypeId) =>
      workTypes.find((workType) => workType.work_type_id === workTypeId),
    )
    .filter((workType): workType is Phase4SeedWorkType => Boolean(workType));

const workTypeTermsForSearch = (workType: Phase4SeedWorkType) =>
  uniqueCompact([
    workType.work_type_id,
    workType.name,
    workType.description,
    ...(workType.aliases_en ?? []),
    ...(workType.example_issues_en ?? []),
  ]);

const dueDateAliases: Record<string, string[]> = {
  Now: ["today", "tänään", "now"],
  "+3 days": ["three days", "within three days", "kolme päivää"],
  "+7 days": ["week", "within a week", "viikko"],
};

const actionAliases: Record<string, string[]> = {
  Korjaus: [
    "fix",
    "fixed",
    "repair",
    "needs to be fixed",
    "should be fixed",
    "korjaa",
    "korjaus",
  ],
  "Maalataan uudestaan": [
    "repaint",
    "paint again",
    "paint damage",
    "wall scratch",
    "maalataan uudestaan",
    "maalivaurio",
  ],
  "Kittaus ja maalaus": [
    "seal",
    "silicone",
    "caulk",
    "missing silicone",
    "kittaus",
    "silikoni",
  ],
  Kuntoon: ["missing", "complete", "make complete", "puuttuu", "kuntoon"],
};

const tagAliases: Record<string, string[]> = {
  Quality: ["quality", "defect", "inspection", "laatu", "virhe"],
  Safety: ["safety", "danger", "hazard", "urgent safety", "turvallisuus", "vaara"],
  Palokatko: ["palokatko", "fire stop", "fire stopping"],
  Environment: ["environment", "waste", "dust", "debris", "ymparisto"],
};

const uniqueCompact = (values: (string | number | null | undefined)[]) =>
  Array.from(new Set(compact(values)));

const compact = (values: (string | number | null | undefined)[]) =>
  values.map((value) => String(value ?? "").trim()).filter(Boolean);

const areaSpecificity = (
  areaType: string | null | undefined,
  areaLabel: string,
) => {
  const text = `${areaType ?? ""} ${areaLabel}`.toLowerCase();
  if (
    text.includes("room") ||
    text.includes("bathroom") ||
    text.includes("kitchen") ||
    text.includes("apartment") ||
    text.includes("stairwell") ||
    text.includes("corridor") ||
    /apt[_\s-]?\d+/i.test(text)
  ) {
    return 35;
  }
  if (text.includes("floor") || text.includes("basement")) {
    return 15;
  }
  return 0;
};
