import {
    initializePhase4HybridRagDatabase
} from "../storage/phase4HybridRagDb";

export function normalizeWorkTypeText(input: string): string {
    return input
        .normalize("NFKC")
        .toLocaleLowerCase("en")
        .replace(/[-_/]+/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// export const testingSqlData = async () => {
//   const db = await initializePhase4HybridRagDatabase();
//   const counts = await getPhase4SeedTableCounts(db);
// //   const projects = await db.getAllAsync<{
// //     project_id: string;
// //     project_name: string;
// //   }>("SELECT project_id, project_name FROM projects LIMIT 3");
//   const workTypeRows = await db.getAllAsync<{
//     work_type_id: string;
//     name: string;
//     description: string | null;
//     alias_text: string | null;
//     normalized_alias: string | null;
//     alias_kind: "alias" | "example_issue" | null;
//   }>(`
//     SELECT
//       work_types.work_type_id,
//       work_types.name,
//       work_types.description,
//       work_type_aliases.alias_text,
//       work_type_aliases.normalized_alias,
//       work_type_aliases.alias_kind
//     FROM work_types
//     LEFT JOIN work_type_aliases
//       ON work_type_aliases.work_type_id = work_types.work_type_id
//     ORDER BY work_types.work_type_id, work_type_aliases.alias_kind, work_type_aliases.alias_text
//   `);
//   const workTypes = Array.from(
//     workTypeRows.reduce((items, row) => {
//       const existing =
//         items.get(row.work_type_id) ??
//         {
//           work_type_id: row.work_type_id,
//           name: row.name,
//           description: row.description,
//           aliases: [] as string[],
//           exampleIssues: [] as string[],
//         };

//       if (row.alias_text && row.alias_kind === "alias") {
//         existing.aliases.push(row.alias_text);
//       }
//       if (row.alias_text && row.alias_kind === "example_issue") {
//         existing.exampleIssues.push(row.alias_text);
//       }

//       items.set(row.work_type_id, existing);
//       return items;
//     }, new Map<string, {
//       work_type_id: string;
//       name: string;
//       description: string | null;
//       aliases: string[];
//       exampleIssues: string[];
//     }>()),
//     ([, item]) => item,
//   );
// //   const companies = await db.getAllAsync<{
// //     company_id: string;
// //     company_name: string;
// //   }>("SELECT company_id, company_name FROM companies LIMIT 3");

// //   const columns = await db.getAllAsync<{
// //     cid: number;
// //     name: string;
// //     type: string;
// //     notnull: number;
// //     dflt_value: string | null;
// //     pk: number;
// //   }>(
// //   `PRAGMA table_info(work_type_aliases);`,
// // );

// console.log("work types with aliases:", JSON.stringify(workTypes, null, 2));

// //   console.log("Phase 4 SQLite counts:", counts);
// //   console.log("Phase 4 SQLite sample projects:", projects);
// //   console.log("Phase 4 SQLite sample work types:", workTypes);
// //   console.log("Phase 4 SQLite sample companies:", companies);

//   return { counts, workTypes };
// };




export type WorkTypeAliasMatchRow = {
    alias_id: string;
    work_type_id: string;
    work_type_name: string;
    alias: string;
    normalized_alias: string;
    is_full_issue_match: number;
    alias_length: number;
};

export async function findWorkTypeAliasMatches(
    // db: SQLiteDatabase = ,
    issue: string
): Promise<WorkTypeAliasMatchRow[]> {
    const db = await initializePhase4HybridRagDatabase();
    const normalizedIssue = normalizeWorkTypeText(issue);

    if (!normalizedIssue) {
        return [];
    }

    return db.getAllAsync<WorkTypeAliasMatchRow>(
        `
      SELECT
        a.alias_id,
        a.work_type_id,
        wt.name AS work_type_name,
        a.alias_text AS alias,
        a.normalized_alias,

        CASE
          WHEN a.normalized_alias = $normalizedIssue THEN 1
          ELSE 0
        END AS is_full_issue_match,

        length(a.normalized_alias) AS alias_length

      FROM work_type_aliases AS a

      JOIN work_types AS wt
        ON wt.work_type_id = a.work_type_id

      WHERE
          a.normalized_alias = $normalizedIssue

          OR instr(
            ' ' || $normalizedIssue || ' ',
            ' ' || a.normalized_alias || ' '
          ) > 0
        
      ORDER BY
        is_full_issue_match DESC,
        alias_length DESC
    `,
        {
            $normalizedIssue: normalizedIssue
        },
    );
}


export const testingSqlData = async (input:string) => {
    const matches = await findWorkTypeAliasMatches(

        // "loose socket"
        // "bad lighting",
        //  "broken window",
        input
        
    );
    console.log("Work-type alias matches:", matches);
}

