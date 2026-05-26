import keywordSeed from "../data/construction_retrieval_keywords_v1.json";
import type { ProjectContextPackage } from "../context/activeProjectContextLoader";
import type { Phase4RetrievalItem } from "./phase4RetrievalTypes";

type KeywordGroup = {
  group_id: string;
  item_type: "work_type";
  work_type_code: string;
  keywords_en?: string[];
  keywords_fi?: string[];
  example_phrases_en?: string[];
  example_phrases_fi?: string[];
};

export const buildPhase4RetrievalItems = (
  context: ProjectContextPackage,
): Phase4RetrievalItem[] => [
  ...context.areas.map((area): Phase4RetrievalItem => {
    const aliases = compact([
      area.area_label,
      area.building_name,
      String(area.floor_or_zone ?? ""),
      ...splitExamples(area.spoken_location_examples),
    ]);
    return {
      itemId: `area:${area.area_id}`,
      projectId: context.project.project_id,
      itemType: "area",
      sourceTable: "areas",
      sourceId: area.area_id,
      displayName: area.area_label,
      exactAliases: aliases,
      searchText: compact([...aliases, area.area_type, area.area_note]).join(" "),
      metadata: {
        buildingName: area.building_name,
        buildingPhase: area.building_phase,
        floorOrZone: area.floor_or_zone,
        areaType: area.area_type,
        parentAreaId: area.parent_area_id,
      },
    };
  }),
  ...context.projectCompanyContext.flatMap((projectContext) => {
    const company = context.companies.find(
      (item) => item.company_id === projectContext.company_id,
    );
    if (!company) {
      return [];
    }
    const triggerKeywords = splitSemicolonText(projectContext.trigger_keywords_en_fi);
    const aliases = compact([
      company.company_name,
      company.primary_trade_group,
      projectContext.work_type_code,
      ...triggerKeywords,
    ]);
    const item: Phase4RetrievalItem = {
      itemId: `company_context:${projectContext.context_id}`,
      projectId: context.project.project_id,
      itemType: "company_context",
      sourceTable: "project_company_context",
      sourceId: projectContext.context_id,
      displayName: company.company_name,
      exactAliases: aliases,
      searchText: compact([
        company.company_name,
        company.company_note,
        projectContext.work_type_code,
        projectContext.project_role,
        projectContext.agreement_scope,
        projectContext.building_scope,
        String(projectContext.floor_or_zone_scope ?? ""),
        projectContext.phase_scope,
        projectContext.candidate_match_note,
        projectContext.note_count_interpretation,
        ...triggerKeywords,
      ]).join(" "),
      metadata: {
        companyId: company.company_id,
        workTypeCode: projectContext.work_type_code,
        projectRole: projectContext.project_role,
        buildingScope: projectContext.building_scope,
        floorOrZoneScope: projectContext.floor_or_zone_scope,
        similarIssueNoteCount: projectContext.similar_issue_note_count,
      },
    };
    return [item];
  }),
  ...keywordGroups().map((group): Phase4RetrievalItem => {
    const terms = compact([
      group.work_type_code,
      ...(group.keywords_en ?? []),
      ...(group.keywords_fi ?? []),
      ...(group.example_phrases_en ?? []),
      ...(group.example_phrases_fi ?? []),
    ]);
    return {
      itemId: `work_type:${context.project.project_id}:${group.work_type_code}`,
      projectId: context.project.project_id,
      itemType: "work_type",
      sourceTable: "construction_retrieval_keywords_v1",
      sourceId: group.group_id,
      displayName: group.work_type_code.replace(/_/g, " "),
      exactAliases: terms,
      searchText: terms.join(" "),
      metadata: { workTypeCode: group.work_type_code },
    };
  }),
  ...context.referenceData.requiredActions.map((action): Phase4RetrievalItem => ({
    itemId: `action:${context.project.project_id}:${action}`,
    projectId: context.project.project_id,
    itemType: "action",
    sourceTable: "required_actions",
    sourceId: action,
    displayName: action,
    exactAliases: [action],
    searchText: action,
    metadata: {},
  })),
  ...context.referenceData.tags.map((tag): Phase4RetrievalItem => ({
    itemId: `tag:${context.project.project_id}:${tag}`,
    projectId: context.project.project_id,
    itemType: "tag",
    sourceTable: "tags",
    sourceId: tag,
    displayName: tag,
    exactAliases: [tag],
    searchText: tag,
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

const dueDateAliases: Record<string, string[]> = {
  Now: ["today", "tänään", "now"],
  "+3 days": ["three days", "within three days", "kolme päivää"],
  "+7 days": ["week", "within a week", "viikko"],
};

const keywordGroups = () =>
  ((keywordSeed as { groups?: KeywordGroup[] }).groups ?? []).filter(
    (group) => group.item_type === "work_type",
  );

const splitExamples = (examples: string[] | undefined) =>
  examples?.flatMap(splitSemicolonText) ?? [];

const splitSemicolonText = (value: string | null | undefined) =>
  value?.split(";").map((item) => item.trim()).filter(Boolean) ?? [];

const compact = (values: (string | number | null | undefined)[]) =>
  values.map((value) => String(value ?? "").trim()).filter(Boolean);
