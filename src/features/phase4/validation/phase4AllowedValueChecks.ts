import type {
  Phase4AllowedDueDate,
  Phase4ReferenceData,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "../types/phase4.types";

export const findAllowedCompany = (
  referenceData: Phase4ReferenceData,
  companyId: unknown,
  displayName: unknown,
) =>
  referenceData.companies.find(
    (company) =>
      typeof companyId === "string" &&
      company.companyId === companyId &&
      (displayName === undefined ||
        displayName === null ||
        displayName === company.displayName ||
        displayName === company.companyId),
  ) ?? null;

export const isAllowedArea = (
  referenceData: Phase4ReferenceData,
  value: unknown,
): value is string =>
  typeof value === "string" &&
  referenceData.formSchema.allowedAreaOptions.includes(value);

export const isAllowedRequiredAction = (
  referenceData: Phase4ReferenceData,
  value: unknown,
): value is Phase4RequiredAction =>
  typeof value === "string" &&
  referenceData.requiredActions.includes(value as Phase4RequiredAction);

export const isAllowedDueDate = (
  referenceData: Phase4ReferenceData,
  value: unknown,
): value is Phase4AllowedDueDate =>
  typeof value === "string" &&
  referenceData.dueDates.includes(value as Phase4AllowedDueDate);

export const filterAllowedTags = (
  referenceData: Phase4ReferenceData,
  value: unknown,
): Phase4TaskTag[] =>
  Array.isArray(value)
    ? value.filter((tag): tag is Phase4TaskTag =>
        referenceData.tags.includes(tag as Phase4TaskTag),
      )
    : [];
