// import { Mistral } from "@mistralai/mistralai";

import { ConstructionExtraction } from "../retrieval/misteralStructuralData";
import { MistralInstructions } from "./mistralInstructions";

// const client = new Mistral({
//   apiKey: process.env.EXPO_MISTRAL_API_KEY,
// });

const apiKey = process.env.EXPO_PUBLIC_MISTRAL_API_KEY;

// const completionArgs = {
//   temperature: 0.07,
//   max_tokens: 512,
//   top_p: 1,
//   response_format: {
//     type: "json_schema",
//     json_schema: {
//       name: "response_schema",
//       schema_definition: {
//         type: "object",
//         additionalProperties: false,
//         required: [
//           "issue",
//           "location",
//           "buildingIdentifier",
//           "unitIdentifier",
//           "levelIdentifier",
//           "spaceType",
//           "timeframe",
//           "workType",
//           "requiredAction",
//           "tags",
//         ],
//         properties: {
//           issue: {
//             type: "string",
//             minLength: 1,
//             description:
//               "Short physical problem or defective object without project, site, building, floor, apartment, unit, room, space, area, or time information.",
//           },
//           location: {
//             anyOf: [
//               {
//                 type: "string",
//                 minLength: 1,
//                 description:
//                   "All explicitly spoken location clues, including project, site, building, floor, apartment, unit, room, space, area, and relative location wording.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           buildingIdentifier: {
//             anyOf: [
//               {
//                 type: "string",
//                 minLength: 1,
//                 description:
//                   "Only the explicitly stated building, block, or tower identifier, such as 2B, B, or A. For a full building name such as Triolintie 2B, return 2B. Do not return site, staircase, apartment, room, or floor identifiers.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           unitIdentifier: {
//             anyOf: [
//               {
//                 type: "string",
//                 minLength: 1,
//                 description:
//                   "Only the explicitly stated apartment, flat, or unit identifier, such as 204, 504, B115, C204, D401, or A-204. Preserve meaningful letters, digits, and separators.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           levelIdentifier: {
//             anyOf: [
//               {
//                 type: "string",
//                 minLength: 1,
//                 description:
//                   "The explicitly stated floor or level identifier in normalized form, such as 4, ground, basement, B1, mezzanine, or roof. Do not infer a level from an apartment number.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           spaceType: {
//             anyOf: [
//               {
//                 type: "string",
//                 enum: [
//                   "apartment_storage",
//                   "balcony",
//                   "bathroom",
//                   "bedroom",
//                   "bicycle_storage",
//                   "corridor",
//                   "entrance_hall",
//                   "kitchen",
//                   "kitchenette",
//                   "laundry_room",
//                   "living_bedroom",
//                   "living_room",
//                   "sauna",
//                   "stairwell",
//                   "technical_room",
//                   "utility_room",
//                   "walk_in_closet",
//                   "wc",
//                   "generic_room",
//                   "other",
//                 ],
//                 description:
//                   "The explicitly stated room or space category normalized to one allowed database-aligned value.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           timeframe: {
//             anyOf: [
//               {
//                 type: "string",
//                 minLength: 1,
//                 description:
//                   "Only an explicitly spoken time or deadline expression. Preserve the spoken expression without calculating a calendar date.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           workType: {
//             anyOf: [
//               {
//                 type: "string",
//                 enum: [
//                   "general_construction",
//                   "painting_finishing",
//                   "plumbing",
//                   "electrical",
//                   "hvac_ventilation",
//                   "tiling",
//                   "sealing_waterproofing",
//                   "doors_windows",
//                   "cleaning",
//                   "flooring",
//                 ],
//                 description:
//                   "The construction trade most likely responsible for the physical issue. Determine it from the defective object and problem, not from the location.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           requiredAction: {
//             anyOf: [
//               {
//                 type: "string",
//                 enum: [
//                   "action_inspect",
//                   "action_repair",
//                   "action_replace",
//                   "action_install",
//                   "action_complete",
//                   "action_adjust",
//                   "action_secure",
//                   "action_clean",
//                   "action_remove",
//                   "action_unblock",
//                   "action_seal",
//                   "action_apply_grout",
//                   "action_paint",
//                   "action_repaint",
//                   "action_fill_and_paint",
//                   "action_sand",
//                   "action_test",
//                 ],
//                 description:
//                   "The most appropriate allowed corrective action based on the physical issue, its condition, any explicitly requested action, and the work type. Return null when no allowed action clearly fits.",
//               },
//               {
//                 type: "null",
//               },
//             ],
//           },
//           tags: {
//             type: "array",
//             uniqueItems: true,
//             maxItems: 6,
//             description:
//               "Zero or more supported task-tag codes justified by explicit wording or by the clear meaning of the issue. Return an empty array when no supported tag applies.",
//             items: {
//               type: "string",
//               enum: [
//                 "tag_environment",
//                 "tag_health",
//                 "tag_induction",
//                 "tag_fire_stopping",
//                 "tag_quality",
//                 "tag_safety",
//               ],
//             },
//           },
//         },
//       },
//     },
//   },
// };

const completionArgs = {
  temperature: 0.07,
  max_tokens: 512,
  top_p: 1,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "response_schema",
      schema_definition: {
        type: "object",
        additionalProperties: false,
        required: ["issues"],
        properties: {
          issues: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            description:
              "One item per independent construction issue. Each issue item becomes one draft form.",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "issue",
                "location",
                "buildingIdentifier",
                "unitIdentifier",
                "levelIdentifier",
                "spaceType",
                "timeframe",
                "workType",
                "requiredAction",
                "tags",
              ],
              properties: {
                issue: {
                  type: "string",
                  minLength: 1,
                  description:
                    "Short physical problem or defective object without project, site, building, floor, apartment, unit, room, space, area, or time information.",
                },
                location: {
                  anyOf: [
                    {
                      type: "string",
                      minLength: 1,
                      description:
                        "All explicitly spoken location clues for this specific issue, including project, site, building, floor, apartment, unit, room, space, area, and relative location wording.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                buildingIdentifier: {
                  anyOf: [
                    {
                      type: "string",
                      minLength: 1,
                      description:
                        "Only the explicitly stated building, block, or tower identifier for this specific issue, such as 2B, B, or A. For a full building name such as Triolintie 2B, return 2B. Do not return site, staircase, apartment, room, or floor identifiers.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                unitIdentifier: {
                  anyOf: [
                    {
                      type: "string",
                      minLength: 1,
                      description:
                        "Only the explicitly stated apartment, flat, or unit identifier for this specific issue, such as 204, 504, B115, C204, D401, or A-204. Preserve meaningful letters, digits, and separators.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                levelIdentifier: {
                  anyOf: [
                    {
                      type: "string",
                      minLength: 1,
                      description:
                        "The explicitly stated floor or level identifier for this specific issue in normalized form, such as 4, ground, basement, B1, mezzanine, or roof. Do not infer a level from an apartment number.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                spaceType: {
                  anyOf: [
                    {
                      type: "string",
                      enum: [
                        "apartment_storage",
                        "balcony",
                        "bathroom",
                        "bedroom",
                        "bicycle_storage",
                        "corridor",
                        "entrance_hall",
                        "kitchen",
                        "kitchenette",
                        "laundry_room",
                        "living_bedroom",
                        "living_room",
                        "sauna",
                        "stairwell",
                        "technical_room",
                        "utility_room",
                        "walk_in_closet",
                        "wc",
                        "generic_room",
                        "other",
                      ],
                      description:
                        "The explicitly stated room or space category for this specific issue, normalized to one allowed database-aligned value.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                timeframe: {
                  anyOf: [
                    {
                      type: "string",
                      minLength: 1,
                      description:
                        "Only an explicitly spoken time or deadline expression for this specific issue. Preserve the spoken expression without calculating a calendar date.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                workType: {
                  anyOf: [
                    {
                      type: "string",
                      enum: [
                        "general_construction",
                        "painting_finishing",
                        "plumbing",
                        "electrical",
                        "hvac_ventilation",
                        "tiling",
                        "sealing_waterproofing",
                        "doors_windows",
                        "cleaning",
                        "flooring",
                      ],
                      description:
                        "The construction trade most likely responsible for this specific physical issue. Determine it from the defective object and problem, not from the location.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                requiredAction: {
                  anyOf: [
                    {
                      type: "string",
                      enum: [
                        "action_inspect",
                        "action_repair",
                        "action_replace",
                        "action_install",
                        "action_complete",
                        "action_adjust",
                        "action_secure",
                        "action_clean",
                        "action_remove",
                        "action_unblock",
                        "action_seal",
                        "action_apply_grout",
                        "action_paint",
                        "action_repaint",
                        "action_fill_and_paint",
                        "action_sand",
                        "action_test",
                      ],
                      description:
                        "The most appropriate allowed corrective action for this specific issue based on the physical issue, its condition, any explicitly requested action, and the work type. Return null when no allowed action clearly fits.",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                tags: {
                  type: "array",
                  uniqueItems: true,
                  maxItems: 6,
                  description:
                    "Zero or more supported task-tag codes for this specific issue, justified by explicit wording or by the clear meaning of the issue. Return an empty array when no supported tag applies.",
                  items: {
                    type: "string",
                    enum: [
                      "tag_environment",
                      "tag_health",
                      "tag_induction",
                      "tag_fire_stopping",
                      "tag_quality",
                      "tag_safety",
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const MistalCallFunc = async (chatInput: string) => {
  const response = await fetch("https://api.mistral.ai/v1/conversations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      inputs: chatInput,
      tools: [],
      completion_args: completionArgs,
      instructions: MistralInstructions,
    }),
  });

  const text = await response.text();

  //   console.log("Mistral status:", response.status);
  // console.log("Mistral body:", text);

  if (!response.ok) {
    throw new Error(`Mistral API failed: ${response.status} ${text}`);
  }

  return { result: JSON.parse(text), responseStatus: response.status };
};

export const parseMistralExtraction = (result: any): ConstructionExtraction => {
  const content =
    result?.outputs?.[0]?.content ?? result?.output ?? result?.content;

  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((item) => item.text ?? "").join("")
        : null;

  if (!text) {
    throw new Error("Could not find Mistral extraction JSON in response.");
  }

  return JSON.parse(text) as ConstructionExtraction;
};
