import type {
  Phase4SeedBuilding,
  Phase4SeedBuildingLevel,
  Phase4SeedBundle,
  Phase4SeedFloor,
  Phase4SeedApartment,
  Phase4SeedApartmentSpace,
  Phase4SeedSharedSpace,
  Phase4SeedSite,
} from "./phase4SeedData";

export type Phase4DerivedArea = {
  area_id: string;
  project_id: string;
  sourceTable:
    | "sites"
    | "buildings"
    | "building_levels"
    | "apartments"
    | "spaces";
  sourceId: string;
  building_id?: string | null;
  building_name?: string | null;
  floor_or_zone?: number | string | null;
  area_type?: string | null;
  area_label: string;
  spoken_location_examples?: string[];
  parent_area_id?: string | null;
  area_note?: string | null;
};

export const buildPhase4DerivedAreas = (
  bundle: Phase4SeedBundle,
): Phase4DerivedArea[] => [
  ...bundle.sites.map(siteToArea),
  ...bundle.buildings.flatMap(buildingToAreas),
];

const siteToArea = (site: Phase4SeedSite): Phase4DerivedArea => ({
  area_id: site.site_id,
  project_id: site.project_id,
  sourceTable: "sites",
  sourceId: site.site_id,
  area_type: "site",
  area_label: site.site_name,
  spoken_location_examples: compactStrings([
    site.site_name,
    site.address_line,
    site.city_district,
    site.city,
  ]),
  parent_area_id: null,
  area_note: site.site_description ?? null,
});

const buildingToAreas = (building: Phase4SeedBuilding): Phase4DerivedArea[] => {
  const buildingArea: Phase4DerivedArea = {
    area_id: building.building_id,
    project_id: building.project_id,
    sourceTable: "buildings",
    sourceId: building.building_id,
    building_id: building.building_id,
    building_name: building.building_name,
    area_type: "building",
    area_label: building.building_name,
    spoken_location_examples: buildingAliases(building),
    parent_area_id: building.site_id,
    area_note: building.address_line,
  };

  const basementAreas = building.basement
    ? levelToAreas(building, building.basement, "basement", buildingArea.area_id)
    : [];
  const floorAreas = building.floors.flatMap((floor) =>
    floorToAreas(building, floor, buildingArea.area_id),
  );

  return [buildingArea, ...basementAreas, ...floorAreas];
};

const levelToAreas = (
  building: Phase4SeedBuilding,
  level: Phase4SeedBuildingLevel,
  areaType: "floor" | "basement",
  parentAreaId: string,
): Phase4DerivedArea[] => {
  const levelArea: Phase4DerivedArea = {
    area_id: level.floor_id,
    project_id: building.project_id,
    sourceTable: "building_levels",
    sourceId: level.floor_id,
    building_id: building.building_id,
    building_name: building.building_name,
    floor_or_zone: level.floor_number,
    area_type: areaType,
    area_label: `${building.building_name} / ${level.floor_label}`,
    spoken_location_examples: compactStrings([
      level.floor_label,
      `${building.building_name} ${level.floor_label}`,
      ...buildingAliases(building).map((alias) => `${alias} ${level.floor_label}`),
    ]),
    parent_area_id: parentAreaId,
  };

  return [
    levelArea,
    ...level.shared_spaces.map((space) =>
      sharedSpaceToArea(building, level, space, levelArea.area_id),
    ),
  ];
};

const floorToAreas = (
  building: Phase4SeedBuilding,
  floor: Phase4SeedFloor,
  parentAreaId: string,
): Phase4DerivedArea[] => {
  const floorAreas = levelToAreas(building, floor, "floor", parentAreaId);
  const apartmentAreas = floor.apartments.flatMap((apartment) =>
    apartmentToAreas(building, floor, apartment, floor.floor_id),
  );
  return [...floorAreas, ...apartmentAreas];
};

const apartmentToAreas = (
  building: Phase4SeedBuilding,
  floor: Phase4SeedFloor,
  apartment: Phase4SeedApartment,
  parentAreaId: string,
): Phase4DerivedArea[] => {
  const apartmentLabel = `${building.building_name} / ${floor.floor_label} / Apartment ${apartment.apartment_number}`;
  const apartmentArea: Phase4DerivedArea = {
    area_id: apartment.apartment_id,
    project_id: building.project_id,
    sourceTable: "apartments",
    sourceId: apartment.apartment_id,
    building_id: building.building_id,
    building_name: building.building_name,
    floor_or_zone: floor.floor_number,
    area_type: "apartment",
    area_label: apartmentLabel,
    spoken_location_examples: compactStrings([
      apartment.apartment_number,
      `apartment ${apartment.apartment_number}`,
      `${floor.floor_label} apartment ${apartment.apartment_number}`,
      `${building.building_name} apartment ${apartment.apartment_number}`,
    ]),
    parent_area_id: parentAreaId,
    area_note: apartment.layout_type,
  };

  return [
    apartmentArea,
    ...apartment.spaces.map((space) =>
      apartmentSpaceToArea(building, floor, apartment, space, apartmentArea.area_id),
    ),
  ];
};

const apartmentSpaceToArea = (
  building: Phase4SeedBuilding,
  floor: Phase4SeedFloor,
  apartment: Phase4SeedApartment,
  space: Phase4SeedApartmentSpace,
  parentAreaId: string,
): Phase4DerivedArea => ({
  area_id: space.space_id,
  project_id: building.project_id,
  sourceTable: "spaces",
  sourceId: space.space_id,
  building_id: building.building_id,
  building_name: building.building_name,
  floor_or_zone: floor.floor_number,
  area_type: space.space_type,
  area_label: `${building.building_name} / ${floor.floor_label} / Apartment ${apartment.apartment_number} / ${space.display_name}`,
  spoken_location_examples: compactStrings([
    space.display_name,
    `${apartment.apartment_number} ${space.display_name}`,
    `apartment ${apartment.apartment_number} ${space.display_name}`,
    `${floor.floor_label} ${apartment.apartment_number} ${space.display_name}`,
  ]),
  parent_area_id: parentAreaId,
});

const sharedSpaceToArea = (
  building: Phase4SeedBuilding,
  level: Phase4SeedBuildingLevel,
  space: Phase4SeedSharedSpace,
  parentAreaId: string,
): Phase4DerivedArea => ({
  area_id: space.space_id,
  project_id: building.project_id,
  sourceTable: "spaces",
  sourceId: space.space_id,
  building_id: building.building_id,
  building_name: building.building_name,
  floor_or_zone: level.floor_number,
  area_type: space.space_type,
  area_label: `${building.building_name} / ${level.floor_label} / ${space.display_name}`,
  spoken_location_examples: compactStrings([
    space.display_name,
    `${level.floor_label} ${space.display_name}`,
    `${building.building_name} ${level.floor_label} ${space.display_name}`,
  ]),
  parent_area_id: parentAreaId,
});

const buildingAliases = (building: Phase4SeedBuilding) =>
  compactStrings([building.building_name, building.building_code, building.address_line]);

const compactStrings = (values: (string | number | null | undefined)[]) =>
  values.map((value) => String(value ?? "").trim()).filter(Boolean);
