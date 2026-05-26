import type { BuildingAreaStructure, NamedZone } from "./projectAreaStructures";

export type GeneratedProjectArea = {
  areaId: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  buildingPhase: BuildingAreaStructure["buildingPhase"];
  floorNumber: number | null;
  unitCode: string | null;
  roomType: string | null;
  zoneCode: string | null;
  areaType:
    | "unit_room"
    | "shared_floor_area"
    | "building_level_area"
    | "foundation_zone"
    | "structural_zone"
    | "site_area";
  displayName: string;
  aliases: string[];
  searchText: string;
};

export function generateProjectAreas(
  structures: BuildingAreaStructure[],
): GeneratedProjectArea[] {
  return structures.flatMap((structure) => [
    ...generateUnitRoomAreas(structure),
    ...generateSharedFloorAreas(structure),
    ...generateNamedZoneAreas(
      structure,
      "building_level_area",
      structure.buildingLevelAreas ?? [],
    ),
    ...generateNamedZoneAreas(
      structure,
      "foundation_zone",
      structure.foundationZones ?? [],
    ),
    ...generateNamedZoneAreas(
      structure,
      "structural_zone",
      structure.structuralZones ?? [],
    ),
    ...generateNamedZoneAreas(structure, "site_area", structure.siteAreas ?? []),
  ]);
}

function generateUnitRoomAreas(
  structure: BuildingAreaStructure,
): GeneratedProjectArea[] {
  if (!structure.unitConfig || !structure.floorStart || !structure.floorEnd) {
    return [];
  }

  const areas: GeneratedProjectArea[] = [];

  for (let floor = structure.floorStart; floor <= structure.floorEnd; floor += 1) {
    for (
      let unit = structure.unitConfig.unitStart;
      unit <= structure.unitConfig.unitEnd;
      unit += 1
    ) {
      const unitCode = `${structure.unitConfig.unitPrefix}${floor}${String(unit).padStart(2, "0")}`;

      for (const roomType of structure.unitConfig.roomTypes) {
        const roomLabel = toDisplayLabel(roomType);
        const displayName = `${structure.buildingName} / Floor ${floor} / ${unitCode} / ${roomLabel}`;
        const aliases = buildUnitRoomAliases(unitCode, roomLabel, structure);

        areas.push({
          areaId: [
            "area",
            structure.projectId,
            structure.buildingId,
            unitCode.toLowerCase(),
            roomType,
          ].join("_"),
          projectId: structure.projectId,
          projectName: structure.projectName,
          buildingId: structure.buildingId,
          buildingName: structure.buildingName,
          buildingPhase: structure.buildingPhase,
          floorNumber: floor,
          unitCode,
          roomType,
          zoneCode: null,
          areaType: "unit_room",
          displayName,
          aliases,
          searchText: buildSearchText({
            projectName: structure.projectName,
            buildingName: structure.buildingName,
            buildingAliases: structure.buildingAliases,
            displayName,
            aliases,
            extraTerms: [
              structure.unitConfig.unitType,
              unitCode,
              `floor ${floor}`,
              floorToEnglishOrdinal(floor),
              roomLabel,
            ],
          }),
        });
      }
    }
  }

  return areas;
}

function generateSharedFloorAreas(
  structure: BuildingAreaStructure,
): GeneratedProjectArea[] {
  if (!structure.floorStart || !structure.floorEnd) {
    return [];
  }

  const areas: GeneratedProjectArea[] = [];

  for (let floor = structure.floorStart; floor <= structure.floorEnd; floor += 1) {
    for (const zone of structure.sharedFloorAreas ?? []) {
      const displayName = `${structure.buildingName} / Floor ${floor} / ${zone.label}`;
      const aliases = buildSharedFloorAliases(floor, zone, structure);

      areas.push({
        areaId: [
          "area",
          structure.projectId,
          structure.buildingId,
          `floor_${floor}`,
          zone.code,
        ].join("_"),
        projectId: structure.projectId,
        projectName: structure.projectName,
        buildingId: structure.buildingId,
        buildingName: structure.buildingName,
        buildingPhase: structure.buildingPhase,
        floorNumber: floor,
        unitCode: null,
        roomType: null,
        zoneCode: zone.code,
        areaType: "shared_floor_area",
        displayName,
        aliases,
        searchText: buildSearchText({
          projectName: structure.projectName,
          buildingName: structure.buildingName,
          buildingAliases: structure.buildingAliases,
          displayName,
          aliases,
          extraTerms: [
            zone.label,
            zone.code,
            `floor ${floor}`,
            floorToEnglishOrdinal(floor),
            "shared area",
            "common area",
          ],
        }),
      });
    }
  }

  return areas;
}

function generateNamedZoneAreas(
  structure: BuildingAreaStructure,
  areaType: GeneratedProjectArea["areaType"],
  zones: NamedZone[],
): GeneratedProjectArea[] {
  return zones.map((zone) => {
    const displayName = `${structure.buildingName} / ${zone.label}`;
    const aliases = [
      zone.label,
      zone.code,
      ...zone.aliases,
      `${structure.buildingName} ${zone.label}`,
      `${zone.label} ${structure.buildingName}`,
      ...structure.buildingAliases.map((alias) => `${alias} ${zone.label}`),
      ...structure.buildingAliases.map((alias) => `${alias} ${zone.code}`),
    ];

    return {
      areaId: [
        "area",
        structure.projectId,
        structure.buildingId,
        zone.code,
      ].join("_"),
      projectId: structure.projectId,
      projectName: structure.projectName,
      buildingId: structure.buildingId,
      buildingName: structure.buildingName,
      buildingPhase: structure.buildingPhase,
      floorNumber: null,
      unitCode: null,
      roomType: null,
      zoneCode: zone.code,
      areaType,
      displayName,
      aliases,
      searchText: buildSearchText({
        projectName: structure.projectName,
        buildingName: structure.buildingName,
        buildingAliases: structure.buildingAliases,
        displayName,
        aliases,
        extraTerms: [zone.label, zone.code, areaType],
      }),
    };
  });
}

function buildUnitRoomAliases(
  unitCode: string,
  roomLabel: string,
  structure: BuildingAreaStructure,
): string[] {
  const spacedUnit = unitCode.replace(/^([A-Z])(\d{3})$/, "$1 $2");
  const unitType = structure.unitConfig?.unitType ?? "unit";

  return [
    `${unitCode} ${roomLabel}`,
    `${spacedUnit} ${roomLabel}`,
    `${unitType} ${unitCode} ${roomLabel}`,
    `${roomLabel} ${unitType} ${unitCode}`,
    `${roomLabel} in ${unitType} ${unitCode}`,
    `${roomLabel} ${unitCode}`,
    `${structure.buildingName} ${unitCode} ${roomLabel}`,
    ...structure.buildingAliases.map((alias) => `${alias} ${unitCode} ${roomLabel}`),
  ];
}

function buildSharedFloorAliases(
  floor: number,
  zone: NamedZone,
  structure: BuildingAreaStructure,
): string[] {
  const ordinal = floorToEnglishOrdinal(floor);

  return [
    `floor ${floor} ${zone.label}`,
    `${zone.label} floor ${floor}`,
    `${ordinal} floor ${zone.label}`,
    `${zone.label} on ${ordinal} floor`,
    `${zone.label} on floor ${floor}`,
    `${structure.buildingName} floor ${floor} ${zone.label}`,
    `${structure.buildingName} ${ordinal} floor ${zone.label}`,
    ...zone.aliases,
    ...structure.buildingAliases.map((alias) => `${alias} floor ${floor} ${zone.label}`),
    ...structure.buildingAliases.map((alias) => `${alias} ${ordinal} floor ${zone.label}`),
  ];
}

function buildSearchText(input: {
  projectName: string;
  buildingName: string;
  buildingAliases: string[];
  displayName: string;
  aliases: string[];
  extraTerms: string[];
}): string {
  return [
    input.projectName,
    input.buildingName,
    ...input.buildingAliases,
    input.displayName,
    ...input.aliases,
    ...input.extraTerms,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function floorToEnglishOrdinal(floor: number): string {
  const map: Record<number, string> = {
    1: "first",
    2: "second",
    3: "third",
    4: "fourth",
    5: "fifth",
    6: "sixth",
    7: "seventh",
    8: "eighth",
    9: "ninth",
    10: "tenth",
  };

  return map[floor] ?? String(floor);
}

function toDisplayLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
