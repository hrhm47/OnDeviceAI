import { generateProjectAreas } from "./generateProjectAreas";
import { phase4BuildingAreaStructures } from "./projectAreaStructures";

export function getGeneratedAreasForProject(projectId: string) {
  return generateProjectAreas(
    phase4BuildingAreaStructures.filter(
      (structure) => structure.projectId === projectId,
    ),
  );
}

export function getBuildingCountForProject(projectId: string) {
  return new Set(
    phase4BuildingAreaStructures
      .filter((structure) => structure.projectId === projectId)
      .map((structure) => structure.buildingId),
  ).size;
}
