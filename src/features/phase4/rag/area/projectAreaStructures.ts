export type UnitAreaConfig = {
  unitPrefix: string;
  unitType: "apartment" | "studio";
  unitStart: number;
  unitEnd: number;
  roomTypes: string[];
};

export type NamedZone = {
  code: string;
  label: string;
  aliases: string[];
};

export type BuildingAreaStructure = {
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  buildingAliases: string[];
  buildingPhase:
    | "interior_finishing_handover"
    | "foundation_early_structural"
    | "renovation_inspection";
  floorStart?: number;
  floorEnd?: number;
  unitConfig?: UnitAreaConfig;
  sharedFloorAreas?: NamedZone[];
  buildingLevelAreas?: NamedZone[];
  siteAreas?: NamedZone[];
  foundationZones?: NamedZone[];
  structuralZones?: NamedZone[];
};

const sharedFloorAreas: NamedZone[] = [
  {
    code: "staircase",
    label: "Staircase",
    aliases: ["staircase", "stairs", "stairwell", "portaikko", "rappukäytävä"],
  },
  {
    code: "corridor",
    label: "Corridor",
    aliases: ["corridor", "hallway", "hall", "käytävä"],
  },
  {
    code: "elevator_lobby",
    label: "Elevator Lobby",
    aliases: ["elevator lobby", "lift lobby", "hissiaula"],
  },
  {
    code: "common_hall",
    label: "Common Hall",
    aliases: ["common hall", "shared hall", "yleisaula"],
  },
];

const buildingLevelAreas: NamedZone[] = [
  {
    code: "main_entrance",
    label: "Main Entrance",
    aliases: ["main entrance", "entrance", "sisäänkäynti"],
  },
  {
    code: "technical_room",
    label: "Technical Room",
    aliases: ["technical room", "plant room", "tekninen tila"],
  },
  {
    code: "basement",
    label: "Basement",
    aliases: ["basement", "cellar", "kellari"],
  },
  {
    code: "roof",
    label: "Roof",
    aliases: ["roof", "katto"],
  },
  {
    code: "storage_room",
    label: "Storage Room",
    aliases: ["storage room", "varasto"],
  },
];

const handoverRoomTypes = [
  "bathroom",
  "kitchen",
  "living_room",
  "bedroom",
  "balcony",
];

const foundationZones: NamedZone[] = [
  {
    code: "north_trench",
    label: "North Trench",
    aliases: [
      "north trench",
      "northern trench",
      "foundation trench north side",
      "pohjoinen kaivanto",
    ],
  },
  {
    code: "south_trench",
    label: "South Trench",
    aliases: [
      "south trench",
      "southern trench",
      "foundation trench south side",
      "eteläinen kaivanto",
    ],
  },
  {
    code: "east_trench",
    label: "East Trench",
    aliases: ["east trench", "eastern trench"],
  },
  {
    code: "west_trench",
    label: "West Trench",
    aliases: ["west trench", "western trench"],
  },
  {
    code: "excavation_zone",
    label: "Excavation Zone",
    aliases: ["excavation zone", "digging area", "kaivualue"],
  },
  {
    code: "drainage_zone",
    label: "Drainage Zone",
    aliases: ["drainage zone", "drain area", "salaoja alue", "water drainage area"],
  },
  {
    code: "piling_grid_b1",
    label: "Piling Grid B1",
    aliases: ["piling grid b1", "pile grid b1", "paalukenttä b1"],
  },
  {
    code: "piling_grid_b2",
    label: "Piling Grid B2",
    aliases: ["piling grid b2", "pile grid b2", "paalukenttä b2"],
  },
  {
    code: "pile_storage",
    label: "Pile Storage",
    aliases: ["pile storage", "piling storage", "paaluvarasto"],
  },
  {
    code: "concrete_slab_zone",
    label: "Concrete Slab Zone",
    aliases: ["concrete slab zone", "slab zone", "laattavalualue"],
  },
  {
    code: "reinforcement_zone",
    label: "Reinforcement Zone",
    aliases: ["reinforcement zone", "rebar area", "raudoitusalue"],
  },
  {
    code: "formwork_zone",
    label: "Formwork Zone",
    aliases: ["formwork zone", "formwork area", "muottialue"],
  },
];

const tuiraSiteZones: NamedZone[] = [
  {
    code: "crane_zone",
    label: "Crane Zone",
    aliases: ["crane zone", "lifting area", "nosturialue"],
  },
  {
    code: "temporary_power_area",
    label: "Temporary Power Area",
    aliases: [
      "temporary power area",
      "site power area",
      "temporary electrical area",
      "temporary power",
      "site cable area",
      "työmaasähkö",
      "väliaikainen sähkö",
    ],
  },
  {
    code: "site_access_road",
    label: "Site Access Road",
    aliases: ["site access road", "access road", "worksite road", "työmaatie"],
  },
  {
    code: "material_storage",
    label: "Material Storage",
    aliases: ["material storage", "storage area", "materiaalivarasto"],
  },
  {
    code: "open_edge_zone",
    label: "Open Edge Zone",
    aliases: ["open edge", "edge zone", "fall risk area", "avoin reuna"],
  },
  {
    code: "safety_barrier_zone",
    label: "Safety Barrier Zone",
    aliases: ["safety barrier", "guardrail area", "kaidealue"],
  },
  {
    code: "water_collection_point",
    label: "Water Collection Point",
    aliases: ["standing water point", "water collection point", "water near trench"],
  },
];

export const phase4BuildingAreaStructures: BuildingAreaStructure[] = [
  {
    projectId: "p1_alppila",
    projectName: "Alppila Apartment Project",
    buildingId: "p1_suppose1",
    buildingName: "Suppose 1",
    buildingAliases: ["suppose 1", "alppila building", "the building"],
    buildingPhase: "interior_finishing_handover",
    floorStart: 1,
    floorEnd: 5,
    unitConfig: {
      unitPrefix: "A",
      unitType: "apartment",
      unitStart: 1,
      unitEnd: 8,
      roomTypes: handoverRoomTypes,
    },
    sharedFloorAreas,
    buildingLevelAreas,
    siteAreas: [
      { code: "yard", label: "Yard", aliases: ["yard", "site yard", "piha"] },
      {
        code: "parking_area",
        label: "Parking Area",
        aliases: ["parking area", "car park", "pysäköintialue"],
      },
      {
        code: "waste_area",
        label: "Waste Area",
        aliases: ["waste area", "trash area", "jätealue"],
      },
      {
        code: "site_access",
        label: "Site Access",
        aliases: ["site access", "entrance to site", "työmaan sisäänkäynti"],
      },
    ],
  },
  {
    projectId: "p2_tuira",
    projectName: "Tuira Mixed Construction Project",
    buildingId: "p2_building_a",
    buildingName: "Building A",
    buildingAliases: ["building a", "talo a", "a building", "tuira building a"],
    buildingPhase: "interior_finishing_handover",
    floorStart: 1,
    floorEnd: 6,
    unitConfig: {
      unitPrefix: "A",
      unitType: "apartment",
      unitStart: 1,
      unitEnd: 8,
      roomTypes: handoverRoomTypes,
    },
    sharedFloorAreas,
    buildingLevelAreas,
  },
  {
    projectId: "p2_tuira",
    projectName: "Tuira Mixed Construction Project",
    buildingId: "p2_building_b",
    buildingName: "Building B",
    buildingAliases: ["building b", "talo b", "b building", "tuira building b"],
    buildingPhase: "foundation_early_structural",
    foundationZones,
    structuralZones: [
      {
        code: "early_structural_zone",
        label: "Early Structural Zone",
        aliases: ["early structural zone", "structural area", "rakennealue"],
      },
      {
        code: "steel_beam_zone",
        label: "Steel Beam Zone",
        aliases: ["steel beam zone", "beam area", "teräspalkkialue"],
      },
    ],
    siteAreas: tuiraSiteZones,
  },
  {
    projectId: "p3_nallikari",
    projectName: "Nallikari Renovation and Quality Inspection",
    buildingId: "p3_building_a",
    buildingName: "Building A",
    buildingAliases: ["building a", "talo a", "nallikari building a"],
    buildingPhase: "renovation_inspection",
    floorStart: 1,
    floorEnd: 4,
    unitConfig: {
      unitPrefix: "S",
      unitType: "studio",
      unitStart: 1,
      unitEnd: 20,
      roomTypes: handoverRoomTypes,
    },
    sharedFloorAreas,
    buildingLevelAreas,
  },
  {
    projectId: "p3_nallikari",
    projectName: "Nallikari Renovation and Quality Inspection",
    buildingId: "p3_building_b",
    buildingName: "Building B",
    buildingAliases: ["building b", "talo b", "nallikari building b"],
    buildingPhase: "renovation_inspection",
    floorStart: 1,
    floorEnd: 4,
    unitConfig: {
      unitPrefix: "B",
      unitType: "apartment",
      unitStart: 1,
      unitEnd: 20,
      roomTypes: handoverRoomTypes,
    },
    sharedFloorAreas,
    buildingLevelAreas,
  },
];
