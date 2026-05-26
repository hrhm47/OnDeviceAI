export type BuildingUnitStructure = {
  projectId: string;
  buildingId: string;
  buildingName: string;
  unitPrefix: string;
  floorStart: number;
  floorEnd: number;
  unitStart: number;
  unitEnd: number;
  roomTypes: string[];
};

export type GeneratedArea = {
  areaId: string;
  projectId: string;
  buildingId: string;
  buildingName: string;
  unitCode: string;
  floorNumber: number;
  unitNumber: number;
  roomType: string;
  displayName: string;
  aliases: string[];
};

export function generateApartmentAreas(
  structure: BuildingUnitStructure,
): GeneratedArea[] {
  const areas: GeneratedArea[] = [];

  for (let floor = structure.floorStart; floor <= structure.floorEnd; floor += 1) {
    for (let unit = structure.unitStart; unit <= structure.unitEnd; unit += 1) {
      const unitCode = `${structure.unitPrefix}${floor}${String(unit).padStart(2, "0")}`;

      for (const roomType of structure.roomTypes) {
        const displayRoom = roomType.replace(/_/g, " ");
        const areaId = [
          "area",
          structure.projectId,
          unitCode.toLowerCase(),
          roomType,
        ].join("_");

        areas.push({
          areaId,
          projectId: structure.projectId,
          buildingId: structure.buildingId,
          buildingName: structure.buildingName,
          unitCode,
          floorNumber: floor,
          unitNumber: unit,
          roomType,
          displayName: `${unitCode} ${displayRoom}`,
          aliases: buildAreaAliases(unitCode, displayRoom),
        });
      }
    }
  }

  return areas;
}

function buildAreaAliases(unitCode: string, room: string): string[] {
  const spacedUnit = unitCode.replace(/^([A-Z])(\d{3})$/, "$1 $2");

  return [
    `${unitCode} ${room}`,
    `${spacedUnit} ${room}`,
    `apartment ${unitCode} ${room}`,
    `${room} apartment ${unitCode}`,
    `${room} in apartment ${unitCode}`,
    `${room} ${unitCode}`,
  ];
}

export const p1AlppilaUnitStructure: BuildingUnitStructure = {
  projectId: "p1_alppila",
  buildingId: "p1_suppose1",
  buildingName: "Suppose 1",
  unitPrefix: "A",
  floorStart: 1,
  floorEnd: 5,
  unitStart: 1,
  unitEnd: 8,
  roomTypes: [
    "bathroom",
    "kitchen",
    "living_room",
    "bedroom",
    "balcony",
    "corridor",
  ],
};
