import type { SQLiteDatabase } from "expo-sqlite";
import { PHASE4_DATASET_VERSION } from "../data/phase4SeedData";
import {
    getPhase4SeedTableCounts,
    importPhase4SeedBundle,
    initializePhase4HybridRagDatabase,
} from "../storage/phase4HybridRagDb";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type SpaceType =
    | "apartment_storage"
    | "balcony"
    | "bathroom"
    | "bedroom"
    | "bicycle_storage"
    | "corridor"
    | "entrance_hall"
    | "kitchen"
    | "kitchenette"
    | "laundry_room"
    | "living_bedroom"
    | "living_room"
    | "sauna"
    | "stairwell"
    | "technical_room"
    | "utility_room"
    | "walk_in_closet"
    | "wc"
    | "generic_room"
    | "other";

export type WorkTypeCode =
    | "general_construction"
    | "painting_finishing"
    | "plumbing"
    | "electrical"
    | "hvac_ventilation"
    | "tiling"
    | "sealing_waterproofing"
    | "doors_windows"
    | "cleaning"
    | "flooring";

export type ConstructionExtraction = {
    issue: string;
    location: string | null;
    buildingIdentifier: string | null;
    unitIdentifier: string | null;
    levelIdentifier: string | null;
    spaceType: SpaceType | null;
    timeframe: string | null;
    workType: WorkTypeCode | null;
    requiredAction: string | null;
    tags: string[];
};

export type ActiveContext = {
    projectId: string;
    defaultBuildingId: string | null;
};

type BuildingRow = {
    building_id: string;
    building_code: string;
    building_name: string;
};

type FloorRow = {
    level_id: string;
    building_id: string;
    floor_number: number;
    level_label: string;
};

type ApartmentRow = {
    apartment_id: string;
    building_id: string;
    floor_number: number;
    apartment_number: string;
};

type SpaceRow = {
    space_id: string;
    apartment_id: string | null;
    level_id: string | null;
    space_type: SpaceType;
    display_name: string;
};

type SpaceCandidateRow = SpaceRow & {
    building_id: string;
    location_kind: "apartment" | "shared";
    floor_number: number;
    level_label: string;
    apartment_number: string | null;
};

export type WorkTypeRow = {
    work_type_id: string;
    name: string;
};

export type LocationResolutionStatus =
    | "resolved"
    | "partially_resolved"
    | "not_found"
    | "conflict"
    | "selection_required";

export type LocationResolution = {
    building: BuildingRow | null;
    floor: FloorRow | null;
    apartment: ApartmentRow | null;
    space: SpaceRow | null;
    spaceCandidates: SpaceCandidateRow[];

    status: LocationResolutionStatus;

    warnings: string[];
    conflicts: string[];
};

export type ResponsibleCompany = {
    contextId: string;
    companyId: string;
    companyName: string;
    workTypeId: string;
};

export type ConstructionResolution = {
    extraction: ConstructionExtraction;
    location: LocationResolution;
    workType: WorkTypeRow | null;
    companies: ResponsibleCompany[];
};

export type StructuralResolverSeedStatus = {
    seeded: boolean;
    reason: string;
    datasetVersion: string | null;
};

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function normalizeIdentifier(value: string): string {
    return value.trim().toLowerCase();
}

function parseLevelIdentifier(
    value: string | null,
): number | null {
    if (!value) {
        return null;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === "basement" || normalized === "b1") {
        return -1;
    }

    if (normalized === "ground") {
        return 0;
    }

    const numericValue = Number(normalized);

    return Number.isInteger(numericValue)
        ? numericValue
        : null;
}

async function ensureStructuralResolverSeedData(
    db: SQLiteDatabase,
): Promise<StructuralResolverSeedStatus> {
    const datasetVersionRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM dataset_meta WHERE key = ? LIMIT 1",
        "dataset_version",
    );
    const counts = await getPhase4SeedTableCounts(db);
    const datasetVersion = datasetVersionRow?.value ?? null;
    const hasRequiredSeedRows =
        counts.projects > 0 &&
        counts.buildings > 0 &&
        counts.buildingLevels > 0 &&
        counts.apartments > 0 &&
        counts.spaces > 0 &&
        counts.workTypes > 0 &&
        counts.companies > 0 &&
        counts.projectCompanyContexts > 0;

    if (datasetVersion === PHASE4_DATASET_VERSION && hasRequiredSeedRows) {
        return {
            seeded: false,
            reason: "Current Phase 4 seed data already exists in SQLite.",
            datasetVersion,
        };
    }

    await importPhase4SeedBundle(db);

    return {
        seeded: true,
        reason: datasetVersion
            ? `SQLite seed data was refreshed from dataset v${datasetVersion} to v${PHASE4_DATASET_VERSION}.`
            : `SQLite seed data was imported for dataset v${PHASE4_DATASET_VERSION}.`,
        datasetVersion: PHASE4_DATASET_VERSION,
    };
}

/* -------------------------------------------------------------------------- */
/* 1. Resolve location entities                                               */
/* -------------------------------------------------------------------------- */

export async function resolveLocationEntities(
    db: SQLiteDatabase,
    extraction: ConstructionExtraction,
    activeContext: ActiveContext,
): Promise<LocationResolution> {
    const warnings: string[] = [];
    const conflicts: string[] = [];

    let building: BuildingRow | null = null;
    let floor: FloorRow | null = null;
    let apartment: ApartmentRow | null = null;
    let space: SpaceRow | null = null;

    /* ---------------------------- Resolve building --------------------------- */

    if (extraction.buildingIdentifier) {
        const buildingIdentifier = normalizeIdentifier(
            extraction.buildingIdentifier,
        );

        building = await db.getFirstAsync<BuildingRow>(
            `
        SELECT
          building_id,
          building_code,
          building_name
        FROM buildings
        WHERE project_id = ?
          AND (
            LOWER(building_code) = ?
            OR LOWER(building_name) = ?
            OR LOWER(building_name) LIKE ?
          )
        LIMIT 1
      `,
            activeContext.projectId,
            buildingIdentifier,
            buildingIdentifier,
            `%${buildingIdentifier}`,
        );

        if (!building) {
            return {
                building: null,
                floor: null,
                apartment: null,
                space: null,
                spaceCandidates: [],
                status: "not_found",
                warnings: [],
                conflicts: [
                    `Building "${extraction.buildingIdentifier}" was not found.`,
                ],
            };
        }
    } else if (activeContext.defaultBuildingId) {
        building = await db.getFirstAsync<BuildingRow>(
            `
        SELECT
          building_id,
          building_code,
          building_name
        FROM buildings
        WHERE building_id = ?
          AND project_id = ?
        LIMIT 1
      `,
            activeContext.defaultBuildingId,
            activeContext.projectId,
        );

        if (building) {
            warnings.push(
                "Building was taken from the active application context.",
            );
        }
    }

    /*
     * Current project fallback:
     * when no building was spoken and no default building was available,
     * use the building only when the project has exactly one.
     */
    if (!building) {
        const projectBuildings =
            await db.getAllAsync<BuildingRow>(
                `
          SELECT
            building_id,
            building_code,
            building_name
          FROM buildings
          WHERE project_id = ?
          LIMIT 2
        `,
                activeContext.projectId,
            );

        if (projectBuildings.length === 1) {
            building = projectBuildings[0];

            warnings.push(
                "Building was inferred because the active project has one building.",
            );
        }
    }

    if (!building) {
        return {
            building: null,
            floor: null,
            apartment: null,
            space: null,
            spaceCandidates: [],
            status: "partially_resolved",
            warnings: [
                ...warnings,
                "A building could not be selected automatically.",
            ],
            conflicts,
        };
    }

    /* ---------------------------- Resolve apartment -------------------------- */

    if (extraction.unitIdentifier) {
        apartment = await db.getFirstAsync<ApartmentRow>(
            `
        SELECT
          apartment_id,
          building_id,
          floor_number,
          apartment_number
        FROM apartments
        WHERE building_id = ?
          AND LOWER(apartment_number) = ?
        LIMIT 1
      `,
            building.building_id,
            normalizeIdentifier(extraction.unitIdentifier),
        );

        if (!apartment) {
            return {
                building,
                floor: null,
                apartment: null,
                space: null,
                spaceCandidates: [],
                status: "not_found",
                warnings,
                conflicts: [
                    `Apartment "${extraction.unitIdentifier}" was not found in Building ${building.building_code}.`,
                ],
            };
        }
    }

    /* ------------------------------ Resolve floor ----------------------------- */

    const spokenFloorNumber = parseLevelIdentifier(
        extraction.levelIdentifier,
    );

    /*
     * An apartment gives us its real database floor.
     * Otherwise, use the explicitly spoken floor.
     */
    const resolvedFloorNumber =
        apartment?.floor_number ?? spokenFloorNumber;

    if (
        apartment &&
        spokenFloorNumber !== null &&
        apartment.floor_number !== spokenFloorNumber
    ) {
        conflicts.push(
            `The transcript states Floor ${spokenFloorNumber}, but Apartment ${apartment.apartment_number} belongs to Floor ${apartment.floor_number}.`,
        );
    }

    if (resolvedFloorNumber !== null) {
        floor = await db.getFirstAsync<FloorRow>(
            `
        SELECT
          level_id,
          building_id,
          floor_number,
          level_label
        FROM building_levels
        WHERE building_id = ?
          AND floor_number = ?
        LIMIT 1
      `,
            building.building_id,
            resolvedFloorNumber,
        );

        if (!floor) {
            warnings.push(
                `Floor "${extraction.levelIdentifier ?? resolvedFloorNumber}" was not found.`,
            );
        }
    }

    /* ------------------------------ Resolve space ----------------------------- */

    if (extraction.spaceType) {
        /*
         * Strongest case:
         * apartment + space type.
         */
        if (apartment) {
            space = await db.getFirstAsync<SpaceRow>(
                `
          SELECT
            space_id,
            apartment_id,
            level_id,
            space_type,
            display_name
          FROM spaces
          WHERE apartment_id = ?
            AND space_type = ?
          LIMIT 1
        `,
                apartment.apartment_id,
                extraction.spaceType,
            );
        }

        /*
         * Shared-space case:
         * floor + corridor, stairwell, technical room, and so on.
         */
        if (!space && floor) {
            space = await db.getFirstAsync<SpaceRow>(
                `
          SELECT
            space_id,
            apartment_id,
            level_id,
            space_type,
            display_name
          FROM spaces
          WHERE level_id = ?
            AND apartment_id IS NULL
            AND space_type = ?
          LIMIT 1
        `,
                floor.level_id,
                extraction.spaceType,
            );
        }

        const spaceCandidates =
            !space &&
                !apartment &&
                !floor &&
                !extraction.unitIdentifier &&
                !extraction.levelIdentifier
                ? await findSpaceCandidatesForBuilding(
                    db,
                    building.building_id,
                    extraction.spaceType,
                )
                : [];

        if (!space) {
            warnings.push(
                spaceCandidates.length > 0
                    ? `An exact "${extraction.spaceType}" space requires selection from ${spaceCandidates.length} candidates.`
                    : `An exact "${extraction.spaceType}" space could not be resolved.`,
            );
        }
        return finalizeLocationResolution({
            building,
            floor,
            apartment,
            space,
            spaceCandidates,
            extraction,
            warnings,
            conflicts,
        });
    }

    /* ---------------------------- Determine status ---------------------------- */

    return finalizeLocationResolution({
        building,
        floor,
        apartment,
        space,
        spaceCandidates: [],
        extraction,
        warnings,
        conflicts,
    });
}

const finalizeLocationResolution = (input: {
    building: BuildingRow;
    floor: FloorRow | null;
    apartment: ApartmentRow | null;
    space: SpaceRow | null;
    spaceCandidates: SpaceCandidateRow[];
    extraction: ConstructionExtraction;
    warnings: string[];
    conflicts: string[];
}): LocationResolution => {
    if (input.conflicts.length > 0) {
        return {
            building: input.building,
            floor: input.floor,
            apartment: input.apartment,
            space: input.space,
            spaceCandidates: input.spaceCandidates,
            status: "conflict",
            warnings: input.warnings,
            conflicts: input.conflicts,
        };
    }

    if (!input.space && input.spaceCandidates.length > 0) {
        return {
            building: input.building,
            floor: input.floor,
            apartment: input.apartment,
            space: input.space,
            spaceCandidates: input.spaceCandidates,
            status: "selection_required",
            warnings: input.warnings,
            conflicts: input.conflicts,
        };
    }

    const requestedSpaceWasResolved =
        !input.extraction.spaceType || input.space !== null;

    const requestedLevelWasResolved =
        !input.extraction.levelIdentifier || input.floor !== null;

    const requestedUnitWasResolved =
        !input.extraction.unitIdentifier || input.apartment !== null;

    const status: LocationResolutionStatus =
        requestedSpaceWasResolved &&
            requestedLevelWasResolved &&
            requestedUnitWasResolved
            ? "resolved"
            : "partially_resolved";

    return {
        building: input.building,
        floor: input.floor,
        apartment: input.apartment,
        space: input.space,
        spaceCandidates: input.spaceCandidates,
        status,
        warnings: input.warnings,
        conflicts: input.conflicts,
    };
};

const findSpaceCandidatesForBuilding = (
    db: SQLiteDatabase,
    buildingId: string,
    spaceType: SpaceType,
) =>
    db.getAllAsync<SpaceCandidateRow>(
        `
      SELECT
        s.space_id,
        s.building_id,
        s.level_id,
        s.apartment_id,
        s.location_kind,
        s.space_type,
        s.display_name,
        bl.floor_number,
        bl.level_label,
        a.apartment_number
      FROM spaces s
      INNER JOIN building_levels bl
        ON bl.level_id = s.level_id
      LEFT JOIN apartments a
        ON a.apartment_id = s.apartment_id
      WHERE s.building_id = ?
        AND s.space_type = ?
      ORDER BY
        bl.floor_number,
        s.location_kind DESC,
        a.apartment_number,
        s.display_name
      LIMIT 30
    `,
        buildingId,
        spaceType,
    );

/* -------------------------------------------------------------------------- */
/* 2. Map Mistral's work-type code to the database row                        */
/* -------------------------------------------------------------------------- */

export async function resolveWorkTypeId(
    db: SQLiteDatabase,
    workType: WorkTypeCode | null,
): Promise<WorkTypeRow | null> {
    if (!workType) {
        return null;
    }

    const workTypeId = `wt_${workType}`;

    return db.getFirstAsync<WorkTypeRow>(
        `
      SELECT
        work_type_id,
        name
      FROM work_types
      WHERE work_type_id = ?
      LIMIT 1
    `,
        workTypeId,
    );
}

/* -------------------------------------------------------------------------- */
/* 3. Find responsible companies                                              */
/* -------------------------------------------------------------------------- */

export async function findResponsibleCompanies(
    db: SQLiteDatabase,
    projectId: string,
    workType: WorkTypeRow | null,
    location: LocationResolution,
    extractedSpaceType: SpaceType | null,
): Promise<ResponsibleCompany[]> {
    if (!workType) {
        return [];
    }

    const buildingId =
        location.building?.building_id ?? null;

    const floorNumber =
        location.floor?.floor_number ?? null;

    const apartmentId =
        location.apartment?.apartment_id ?? null;

    const spaceType =
        location.space?.space_type ?? extractedSpaceType;

    return db.getAllAsync<ResponsibleCompany>(
        `
      SELECT DISTINCT
        pcc.context_id AS contextId,
        c.company_id AS companyId,
        c.company_name AS companyName,
        cwt.work_type_id AS workTypeId
      FROM project_company_contexts pcc

      INNER JOIN companies c
        ON c.company_id = pcc.company_id

      INNER JOIN context_work_types cwt
        ON cwt.context_id = pcc.context_id

      WHERE pcc.project_id = ?
        AND pcc.status = 'active'
        AND c.company_status = 'active'
        AND cwt.work_type_id = ?

        /* Building check */
        AND (
          ? IS NULL
          OR EXISTS (
            SELECT 1
            FROM context_buildings cb
            WHERE cb.context_id = pcc.context_id
              AND cb.building_id = ?
          )
        )

        /* Floor check */
        AND (
          ? IS NULL
          OR (
            ? = -1
            AND pcc.includes_basement = 1
          )
          OR EXISTS (
            SELECT 1
            FROM context_floors cf
            WHERE cf.context_id = pcc.context_id
              AND cf.floor_number = ?
          )
        )

        /*
         * Apartment check:
         * no context_apartments rows means all apartments.
         */
        AND (
          ? IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM context_apartments ca_all
            WHERE ca_all.context_id = pcc.context_id
          )
          OR EXISTS (
            SELECT 1
            FROM context_apartments ca
            WHERE ca.context_id = pcc.context_id
              AND ca.apartment_id = ?
          )
        )

        /*
         * Space check:
         * no context_space_types rows means all space types.
         */
        AND (
          ? IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM context_space_types cst_all
            WHERE cst_all.context_id = pcc.context_id
          )
          OR EXISTS (
            SELECT 1
            FROM context_space_types cst
            WHERE cst.context_id = pcc.context_id
              AND cst.space_type = ?
          )
        )

      ORDER BY c.company_name
    `,
        projectId,
        workType.work_type_id,

        buildingId,
        buildingId,

        floorNumber,
        floorNumber,
        floorNumber,

        apartmentId,
        apartmentId,

        spaceType,
        spaceType,
    );
}

/* -------------------------------------------------------------------------- */
/* Main function                                                              */
/* -------------------------------------------------------------------------- */

export async function resolveConstructionExtraction(
    extraction: ConstructionExtraction,
    activeContext: ActiveContext,
): Promise<ConstructionResolution> {
    const db = await initializePhase4HybridRagDatabase();
    await ensureStructuralResolverSeedData(db);
    const location = await resolveLocationEntities(
        db,
        extraction,
        activeContext,
    );

    const workType = await resolveWorkTypeId(
        db,
        extraction.workType,
    );

    const companies = await findResponsibleCompanies(
        db,
        activeContext.projectId,
        workType,
        location,
        extraction.spaceType,
    );

    return {
        extraction,
        location,
        workType,
        companies,
    };
}



export const extraction: ConstructionExtraction = {
    issue: "leaking kitchen tap",
    location: "Building 2B apartment 504 kitchen",
    buildingIdentifier: "2B",
    unitIdentifier: "504",
    levelIdentifier: null,
    spaceType: "kitchen",
    timeframe: null,
    workType: "plumbing",
    requiredAction: "action_repair",
    tags: ["tag_quality"],
};


export async function testResolveConstructionExtraction(InputExtraction?: ConstructionExtraction) {
    const db = await initializePhase4HybridRagDatabase();
    const seedStatus = await ensureStructuralResolverSeedData(db);

    console.log(
        "Seed status:",
        seedStatus,
    );

    const result = await resolveConstructionExtraction(
        InputExtraction || extraction,
        {
            projectId: "p1_alppila_residential",
            defaultBuildingId: "bldg_triolitie_2b",
        },
    );

    console.log(
        "Resolved construction extraction:",
        JSON.stringify(result, null, 2),
    );

    console.log(
        "Location:",
        JSON.stringify(result.location, null, 2),
    );

    console.log(
        "Work type:",
        JSON.stringify(result.workType, null, 2),
    );

    console.log(
        "Companies:",
        JSON.stringify(result.companies, null, 2),
    );
}
