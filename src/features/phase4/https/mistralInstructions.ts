// export const MistralInstructions = `Extract one construction issue from the transcript.\nReturn exactly one JSON object containing all eight fields:\n* issue\n* location\n* buildingIdentifier\n* unitIdentifier\n* levelIdentifier\n* spaceType\n* timeframe\n* workType\nEvery field must always be present.\nFor unavailable optional information, return null.\nNever omit a required field.\nIssue\nReturn only the physical problem or defective object.\nRemove project, site, building, floor, apartment, unit, room, space, area, and time information from the issue.\nKeep the wording short while preserving the original meaning.\nExamples:\n* "the socket is loose" → "loose socket"\n* "the door does not close" → "door does not close"\n* "the bathroom tile is cracked" → "cracked tile"\n* "the skirting board is missing from the living room" → "missing skirting board"\nDo not reverse negation or change the meaning of the defect.\nLocation\nInclude every explicitly spoken location clue.\nLocation clues may include:\n* project or site name\n* address\n* building, block, or tower\n* floor or level\n* apartment, flat, or unit\n* room or space\n* area\n* relative location wording\nPreserve explicitly spoken proper names such as Alppila and Triolintie 2B.\nDo not omit a broader named location because a more specific building, apartment, unit, room, or space is also stated.\nRoom and space words such as bathroom, toilet, WC, kitchen, kitchenette, living room, sleeping area, bedroom, corridor, hallway, stairwell, sauna, balcony, entrance hall, storage area, bicycle storage, laundry room, technical room, utility room, and walk-in closet belong to location, even when they appear directly before the defective object.\nExamples:\n* "bedroom window" means the issue concerns a window and location includes "bedroom".\n* "bathroom socket" means the issue concerns a socket and location includes "bathroom".\n* "at Alppila in unit 204 bathroom" means location must preserve "Alppila", "unit 204", and "bathroom".\n* "in Triolintie 2B on the fourth floor" means location must preserve "Triolintie 2B" and "fourth floor".\n* "under the sink in Apartment 504 kitchen" means location includes "Apartment 504 kitchen". The phrase "under the sink" may remain in issue because it describes where the physical problem occurs relative to the defective object.\nUse null when no location is explicitly stated.\nAlways include location, even when its value is null.\nBuilding identifier\nReturn only an explicitly stated building, block, or tower identifier.\nReturn the identifier without words such as:\n* building\n* block\n* tower\nExamples:\n* "Building 2B" → "2B"\n* "building B" → "B"\n* "Block 2B" → "2B"\n* "Tower A" → "A"\n* "Triolintie 2B" → "2B"\n* "the 2B building" → "2B"\nPreserve meaningful letters, digits, and separators.\nDo not change:\n* "2B" into "2"\n* "B2" into "2"\n* "A-2" into "A2"\nThe full building wording must still remain inside location.\nOnly return a building identifier when the transcript explicitly identifies a building, block, or tower.\nA standalone code such as "2B" may be returned only when the surrounding wording clearly uses it as a building reference.\nDo not extract identifiers belonging to another location type.\nExamples:\n* "Triolintie 2" → buildingIdentifier = null\n* "Alppila" → buildingIdentifier = null\n* "staircase B" → buildingIdentifier = null\n* "Apartment B204" → buildingIdentifier = null\n* "unit 204" → buildingIdentifier = null\n* "Bedroom 2" → buildingIdentifier = null\n* "Floor 2" → buildingIdentifier = null\n* "corridor B" → buildingIdentifier = null\nDo not infer the building from an apartment, unit, floor, site, project, or active application context.\nExamples:\n* "Apartment 504" → buildingIdentifier = null\n* "fourth floor corridor" → buildingIdentifier = null\n* "at Triolintie 2" → buildingIdentifier = null\nWhen no building, block, or tower identifier is explicitly stated, always return:\n"buildingIdentifier": null\nNever omit buildingIdentifier.\nUnit identifier\nReturn only an explicitly stated apartment, flat, or unit identifier.\nReturn the identifier without words such as:\n* apartment\n* unit\n* flat\n* residence\nExamples:\n* "Apartment 504" → "504"\n* "unit 204" → "204"\n* "apartment B115" → "B115"\n* "Apartment C204" → "C204"\n* "flat D401" → "D401"\n* "unit A-204" → "A-204"\nPreserve all meaningful letters, digits, and separators.\nDo not change:\n* "B115" into "115"\n* "D401" into "401"\n* "A-204" into "204"\nMinor spacing around separators may be normalized, but the identifier itself must remain unchanged in meaning.\nOnly return a value when the identifier is explicitly connected to an apartment, unit, or flat.\nDo not extract identifiers belonging to other location types.\nExamples:\n* "staircase B" → unitIdentifier = null\n* "Building B" → unitIdentifier = null\n* "Triolintie 2B" → unitIdentifier = null\n* "third floor" → unitIdentifier = null\n* "fourth floor corridor" → unitIdentifier = null\n* "room 204" → unitIdentifier = null\n* "corridor 4" → unitIdentifier = null\n* "entrance walkway" → unitIdentifier = null\nDo not infer an apartment or unit identifier from an unrelated number or letter.\nThe complete apartment, flat, or unit wording must still remain inside location.\nWhen no apartment, flat, or unit identifier is explicitly stated, always return:\n"unitIdentifier": null\nNever omit unitIdentifier.\nLevel identifier\nReturn the explicitly stated floor or level identifier in normalized form.\nThe complete floor or level wording must still remain inside location.\nConvert clearly stated written numbers and ordinal numbers into compact identifiers.\nExamples:\n* "fourth floor" → "4"\n* "the fourth-floor corridor" → "4"\n* "floor four" → "4"\n* "floor 4" → "4"\n* "level four" → "4"\n* "level 3" → "3"\n* "first floor" → "1"\n* "second level" → "2"\n* "seventh storey" → "7"\nPreserve meaningful non-numeric level identifiers.\nExamples:\n* "ground floor" → "ground"\n* "basement" → "basement"\n* "basement level one" → "B1"\n* "basement floor 2" → "B2"\n* "mezzanine" → "mezzanine"\n* "roof level" → "roof"\nOnly return a value when the transcript explicitly states a floor or level.\nDo not infer a floor from an apartment or unit identifier.\nExamples:\n* "Apartment 405" → levelIdentifier = null\n* "unit 504" → levelIdentifier = null\n* "unit B115" → levelIdentifier = null\n* "room 204" → levelIdentifier = null\n* "staircase B" → levelIdentifier = null\n* "Building 4" → levelIdentifier = null\n* "corridor 4" → levelIdentifier = null\nDo not treat every number as a floor identifier.\nA value belongs to levelIdentifier only when it is explicitly connected to wording such as:\n* floor\n* level\n* storey\n* story\n* basement\n* ground floor\n* mezzanine\n* roof level\nWhen no floor or level is explicitly stated, always return:\n"levelIdentifier": null\nNever omit levelIdentifier.\nSpace type\nReturn the explicitly stated room or space category in normalized form.\nChoose exactly one of:\n* apartment_storage\n* balcony\n* bathroom\n* bedroom\n* bicycle_storage\n* corridor\n* entrance_hall\n* kitchen\n* kitchenette\n* laundry_room\n* living_bedroom\n* living_room\n* sauna\n* stairwell\n* technical_room\n* utility_room\n* walk_in_closet\n* wc\n* generic_room\n* other\nNormalize clearly equivalent spoken terms to the database-aligned value.\nExamples:\n* "toilet" → "wc"\n* "WC" → "wc"\n* "entrance" → "entrance_hall"\n* "entrance hall" → "entrance_hall"\n* "hallway" → "corridor" when it clearly refers to a shared passage\n* "small kitchen" → "kitchenette" only when the wording clearly identifies a kitchenette\n* "kitchenette" → "kitchenette"\n* "laundry" → "laundry_room"\n* "laundry room" → "laundry_room"\n* "bike storage" → "bicycle_storage"\n* "bicycle room" → "bicycle_storage"\n* "apartment storage area" → "apartment_storage"\n* "walk-in wardrobe" → "walk_in_closet"\n* "walk-in closet" → "walk_in_closet"\n* "living room" → "living_room"\n* "living room and sleeping area" → "living_bedroom"\n* "studio sleeping area" → "living_bedroom" only when the combined space is clearly stated\n* "fourth floor corridor" → "corridor"\n* "Apartment 504 kitchen" → "kitchen"\n* "technical room" → "technical_room"\n* "staircase B" → "stairwell"\nUse "generic_room" only when the transcript explicitly says "room" without identifying a more specific room type.\nUse "other" only when an explicit room or space is stated but it does not fit any available category.\nUse null when no room or space type is explicitly stated.\nDetermine spaceType only from explicitly spoken location wording.\nDo not infer spaceType from the defective object, work type, apartment layout, user context, or database knowledge.\nExamples:\n* "kitchen socket":\n    * spaceType = "kitchen"\n    * workType = "electrical"\n* "bathroom tile":\n    * spaceType = "bathroom"\n    * workType = "tiling"\n* "corridor light fixture":\n    * spaceType = "corridor"\n    * workType = "electrical"\nA floor, apartment, unit, building, project, site, or relative object position is not by itself a spaceType.\nExamples:\n* "Apartment 405" → spaceType = null\n* "fourth floor" → spaceType = null\n* "Building 2B" → spaceType = null\n* "Alppila" → spaceType = null\n* "under the sink" → do not use "sink" as spaceType\nWhen no room or space type is explicitly stated, always return:\n"spaceType": null\nNever omit spaceType.\nTimeframe\nReturn only an explicitly spoken time or deadline expression, such as:\n* today\n* tomorrow\n* by Friday\n* next week\nUse null when no explicit timeframe is stated.\nDo not calculate, expand, or normalize the date unless explicitly requested.\nPriority words are not timeframes.\nExamples:\n* "urgent" → timeframe = null\n* "high priority" → timeframe = null\n* "as soon as possible" → return the spoken wording only if it is being treated as an explicit timing instruction; otherwise return null\nAlways include timeframe, even when its value is null.\nWork type\nChoose the construction trade most likely needed for the physical issue.\nDetermine workType from:\n1. the defective object;\n2. the problem or condition affecting that object.\nDo not determine workType from the room, space, apartment, floor, building, project, site, user role, or location wording alone.\nChoose exactly one of:\n* general_construction\n* painting_finishing\n* plumbing\n* electrical\n* hvac_ventilation\n* tiling\n* sealing_waterproofing\n* doors_windows\n* cleaning\n* flooring\nUse null when the physical issue does not clearly identify a work type.\nDo not guess a work type from vague wording such as "something is damaged".\nUse general_construction only when no more specific listed work type clearly fits the defective object or problem.\nDo not use general_construction merely as a default.\nWork-type guidance:\n* sockets, switches, lights, light fixtures, lighting, cables, wiring, and electrical panels → electrical\n* pipes, drains, sinks, toilets, taps, faucets, and visible plumbing leaks → plumbing\n* ventilation, airflow, vents, radiators, heating, cooling, and thermostats → hvac_ventilation\n* tiles and grout → tiling\n* silicone, sealants, waterproofing, membranes, and wet-area sealing → sealing_waterproofing\n* doors, windows, handles, locks, hinges, and door or window adjustment problems → doors_windows\n* dust, waste, debris, rubbish, and final cleaning → cleaning\n* laminate, parquet, vinyl, flooring, floor coverings, and skirting boards → flooring\n* paint damage, peeling paint, scratches on painted surfaces, repainting, and poor surface finishes → painting_finishing\n* non-specialist building repairs or construction work that does not clearly belong to another listed trade → general_construction\nExamples:\n* a socket in a bathroom → electrical, not plumbing\n* a light in a kitchen → electrical\n* loose cables near an entrance → electrical\n* a dirty floor → cleaning, not flooring\n* a cracked floor tile → tiling, not flooring\n* water collecting under a sink → plumbing\n* a damaged window → doors_windows\n* a missing skirting board → flooring, not general_construction\n* a scratched painted wall → painting_finishing\n* a loose temporary safety railing → general_construction\nAn explicitly named contractor does not override the physical issue.\nExample:\n* "The kitchen tap is leaking. Assign it to the electrical contractor." → workType = "plumbing"\nAlways include workType, even when its value is null.\nGeneral rules\n* Return exactly eight fields.\n* Every field must always be present.\n* Use null for unavailable optional information.\n* Never omit buildingIdentifier.\n* Never omit unitIdentifier.\n* Never omit levelIdentifier.\n* Never omit spaceType.\n* Never omit location, timeframe, or workType.\n* Do not confuse buildingIdentifier, unitIdentifier, and levelIdentifier.\n* Do not infer a building from a site, apartment, unit, or floor.\n* Do not infer a floor from an apartment or unit number.\n* Do not infer a space type from the issue or database context.\n* Do not invent missing information.\n* Do not silently correct explicitly spoken identifiers.\n* Do not omit explicitly stated proper names.\n* Do not repeat location information inside issue.\n* Do not place room or space information inside issue unless it is part of the defective object itself.\n* Do not add explanations.\n* Return only the JSON object required by the supplied schema.\n* Do not include markdown or code fences.\nExample 1\nTranscript:\n"The bedroom window is damaged in Apartment 405."\nOutput:\n{"issue": "damaged window","location": "Apartment 405 bedroom","buildingIdentifier": null,"unitIdentifier": "405","levelIdentifier": null,"spaceType": "bedroom","timeframe": null,"workType": "doors_windows"}\nExample 2\nTranscript:\n"At Alppila, the socket in the bathroom of unit 204 is loose today."\nOutput:\n{"issue": "loose socket","location": "Alppila, unit 204 bathroom","buildingIdentifier": null,"unitIdentifier": "204","levelIdentifier": null,"spaceType": "bathroom","timeframe": "today","workType": "electrical"}\nExample 3\nTranscript:\n"Something is damaged near the entrance."\nOutput:\n{"issue": "damaged object","location": "near the entrance","buildingIdentifier": null,"unitIdentifier": null,"levelIdentifier": null,"spaceType": "entrance_hall","timeframe": null,"workType": null}\nExample 4\nTranscript:\n"Water is collecting under the sink in Apartment 504 kitchen."\nOutput:\n{"issue": "water collecting under the sink","location": "Apartment 504 kitchen","buildingIdentifier": null,"unitIdentifier": "504","levelIdentifier": null,"spaceType": "kitchen","timeframe": null,"workType": "plumbing"}\nExample 5\nTranscript:\n"The light fixture in the fourth floor corridor is hanging loose. Assign this to the electrical contractor."\nOutput:\n{"issue": "loose light fixture","location": "fourth floor corridor","buildingIdentifier": null,"unitIdentifier": null,"levelIdentifier": "4","spaceType": "corridor","timeframe": null,"workType": "electrical"}\nExample 6\nTranscript:\n"The skirting board is missing from the living room wall in apartment D401."\nOutput:\n{"issue": "missing skirting board","location": "apartment D401 living room","buildingIdentifier": null,"unitIdentifier": "D401","levelIdentifier": null,"spaceType": "living_room","timeframe": null,"workType": "flooring"}\nExample 7\nTranscript:\n"The temporary railing in staircase B on the third floor is loose. Mark this as urgent."\nOutput:\n{"issue": "loose temporary railing","location": "staircase B third floor","buildingIdentifier": null,"unitIdentifier": null,"levelIdentifier": "3","spaceType": "stairwell","timeframe": null,"workType": "general_construction"}\nThe word "urgent" expresses priority, not an explicit timeframe.\nExample 8\nTranscript:\n"The kitchen wall in apartment B115 has visible paint damage near the window."\nOutput:\n{"issue": "visible paint damage","location": "apartment B115 kitchen near the window","buildingIdentifier": null,"unitIdentifier": "B115","levelIdentifier": null,"spaceType": "kitchen","timeframe": null,"workType": "painting_finishing"}\nExample 9\nTranscript:\n"The balcony door in apartment C204 does not close properly and cold air is coming through the seal."\nOutput:\n{"issue": "door does not close properly and cold air is coming through the seal","location": "apartment C204 balcony","buildingIdentifier": null,"unitIdentifier": "C204","levelIdentifier": null,"spaceType": "balcony","timeframe": null,"workType": "doors_windows"}\nExample 10\nTranscript:\n"There are loose cables near the main entrance walkway. This may cause a tripping hazard."\nOutput:\n{"issue": "loose cables","location": "near the main entrance walkway","buildingIdentifier": null,"unitIdentifier": null,"levelIdentifier": null,"spaceType": "entrance_hall","timeframe": null,"workType": "electrical"}\nExample 11\nTranscript:\n"The handrail in the third-floor stairwell of Triolintie 2B is loose."\nOutput:\n{"issue": "loose handrail","location": "Triolintie 2B third-floor stairwell","buildingIdentifier": "2B","unitIdentifier": null,"levelIdentifier": "3","spaceType": "stairwell","timeframe": null,"workType": "general_construction"}\nExample 12\nTranscript:\n"The kitchen tap in apartment 504 of Building 2B is leaking."\nOutput:\n{"issue": "leaking kitchen tap","location": "Building 2B apartment 504 kitchen","buildingIdentifier": "2B","unitIdentifier": "504","levelIdentifier": null,"spaceType": "kitchen","timeframe": null,"workType": "plumbing"}\nExample 13\nTranscript:\n"At Triolintie 2, the light in the fourth-floor corridor is loose."\nOutput:\n{"issue": "loose light","location": "Triolintie 2 fourth-floor corridor","buildingIdentifier": null,"unitIdentifier": null,"levelIdentifier": "4","spaceType": "corridor","timeframe": null,"workType": "electrical"}\nTriolintie 2 is preserved as a site or address clue, but it is not returned as a building identifier.\nExample 14\nTranscript:\n"At Triolintie 2B, the ventilation in the basement technical room is not working."\nOutput:\n{"issue": "ventilation not working","location": "Triolintie 2B basement technical room","buildingIdentifier": "2B","unitIdentifier": null,"levelIdentifier": "basement","spaceType": "technical_room","timeframe": null,"workType": "hvac_ventilation"}`;



// export const MistralInstructions = `Extract one construction issue from the transcript.
// Return exactly one JSON object containing all ten fields:
// •	issue
// •	location
// •	buildingIdentifier
// •	unitIdentifier
// •	levelIdentifier
// •	spaceType
// •	timeframe
// •	workType
// •	requiredAction
// •	tags
// Every field must always be present.
// For unavailable scalar information, return null.
// For tags, return an empty array when no supported tag applies.
// Never omit a required field.
// Issue
// Return only the physical problem or defective object.
// Remove project, site, building, floor, apartment, unit, room, space, area, and time information from the issue.
// Keep the wording short while preserving the original meaning.
// Examples:
// •	"the socket is loose" → "loose socket"
// •	"the door does not close" → "door does not close"
// •	"the bathroom tile is cracked" → "cracked tile"
// •	"the skirting board is missing from the living room" → "missing skirting board"
// Do not reverse negation or change the meaning of the defect.
// Location
// Include every explicitly spoken location clue.
// Location clues may include:
// •	project or site name
// •	address
// •	building, block, or tower
// •	floor or level
// •	apartment, flat, or unit
// •	room or space
// •	area
// •	relative location wording
// Preserve explicitly spoken proper names such as Alppila and Triolintie 2B.
// Do not omit a broader named location because a more specific building, apartment, unit, room, or space is also stated.
// Room and space words such as bathroom, toilet, WC, kitchen, kitchenette, living room, sleeping area, bedroom, corridor, hallway, stairwell, sauna, balcony, entrance hall, storage area, bicycle storage, laundry room, technical room, utility room, and walk-in closet belong to location, even when they appear directly before the defective object.
// Examples:
// •	"bedroom window" means the issue concerns a window and location includes "bedroom".
// •	"bathroom socket" means the issue concerns a socket and location includes "bathroom".
// •	"at Alppila in unit 204 bathroom" means location must preserve "Alppila", "unit 204", and "bathroom".
// •	"in Triolintie 2B on the fourth floor" means location must preserve "Triolintie 2B" and "fourth floor".
// •	"under the sink in Apartment 504 kitchen" means location includes "Apartment 504 kitchen". The phrase "under the sink" may remain in issue because it describes where the physical problem occurs relative to the defective object.
// Use null when no location is explicitly stated.
// Always include location, even when its value is null.
// Building identifier
// Return only an explicitly stated building, block, or tower identifier.
// Return the identifier without words such as:
// •	building
// •	block
// •	tower
// Examples:
// •	"Building 2B" → "2B"
// •	"building B" → "B"
// •	"Block 2B" → "2B"
// •	"Tower A" → "A"
// •	"Triolintie 2B" → "2B"
// •	"the 2B building" → "2B"
// Preserve meaningful letters, digits, and separators.
// Do not change:
// •	"2B" into "2"
// •	"B2" into "2"
// •	"A-2" into "A2"
// The full building wording must still remain inside location.
// Only return a building identifier when the transcript explicitly identifies a building, block, or tower.
// A standalone code such as "2B" may be returned only when the surrounding wording clearly uses it as a building reference.
// Do not extract identifiers belonging to another location type.
// Examples:
// •	"Triolintie 2" → buildingIdentifier = null
// •	"Alppila" → buildingIdentifier = null
// •	"staircase B" → buildingIdentifier = null
// •	"Apartment B204" → buildingIdentifier = null
// •	"unit 204" → buildingIdentifier = null
// •	"Bedroom 2" → buildingIdentifier = null
// •	"Floor 2" → buildingIdentifier = null
// •	"corridor B" → buildingIdentifier = null
// Do not infer the building from an apartment, unit, floor, site, project, or active application context.
// Examples:
// •	"Apartment 504" → buildingIdentifier = null
// •	"fourth floor corridor" → buildingIdentifier = null
// •	"at Triolintie 2" → buildingIdentifier = null
// When no building, block, or tower identifier is explicitly stated, always return:
// "buildingIdentifier": null
// Never omit buildingIdentifier.
// Unit identifier
// Return only an explicitly stated apartment, flat, or unit identifier.
// Return the identifier without words such as:
// •	apartment
// •	unit
// •	flat
// •	residence
// Examples:
// •	"Apartment 504" → "504"
// •	"unit 204" → "204"
// •	"apartment B115" → "B115"
// •	"Apartment C204" → "C204"
// •	"flat D401" → "D401"
// •	"unit A-204" → "A-204"
// Preserve all meaningful letters, digits, and separators.
// Do not change:
// •	"B115" into "115"
// •	"D401" into "401"
// •	"A-204" into "204"
// Minor spacing around separators may be normalized, but the identifier itself must remain unchanged in meaning.
// Only return a value when the identifier is explicitly connected to an apartment, unit, or flat.
// Do not extract identifiers belonging to other location types.
// Examples:
// •	"staircase B" → unitIdentifier = null
// •	"Building B" → unitIdentifier = null
// •	"Triolintie 2B" → unitIdentifier = null
// •	"third floor" → unitIdentifier = null
// •	"fourth floor corridor" → unitIdentifier = null
// •	"room 204" → unitIdentifier = null
// •	"corridor 4" → unitIdentifier = null
// •	"entrance walkway" → unitIdentifier = null
// Do not infer an apartment or unit identifier from an unrelated number or letter.
// The complete apartment, flat, or unit wording must still remain inside location.
// When no apartment, flat, or unit identifier is explicitly stated, always return:
// "unitIdentifier": null
// Never omit unitIdentifier.
// Level identifier
// Return the explicitly stated floor or level identifier in normalized form.
// The complete floor or level wording must still remain inside location.
// Convert clearly stated written numbers and ordinal numbers into compact identifiers.
// Examples:
// •	"fourth floor" → "4"
// •	"the fourth-floor corridor" → "4"
// •	"floor four" → "4"
// •	"floor 4" → "4"
// •	"level four" → "4"
// •	"level 3" → "3"
// •	"first floor" → "1"
// •	"second level" → "2"
// •	"seventh storey" → "7"
// Preserve meaningful non-numeric level identifiers.
// Examples:
// •	"ground floor" → "ground"
// •	"basement" → "basement"
// •	"basement level one" → "B1"
// •	"basement floor 2" → "B2"
// •	"mezzanine" → "mezzanine"
// •	"roof level" → "roof"
// Only return a value when the transcript explicitly states a floor or level.
// Do not infer a floor from an apartment or unit identifier.
// Examples:
// •	"Apartment 405" → levelIdentifier = null
// •	"unit 504" → levelIdentifier = null
// •	"unit B115" → levelIdentifier = null
// •	"room 204" → levelIdentifier = null
// •	"staircase B" → levelIdentifier = null
// •	"Building 4" → levelIdentifier = null
// •	"corridor 4" → levelIdentifier = null
// Do not treat every number as a floor identifier.
// A value belongs to levelIdentifier only when it is explicitly connected to wording such as:
// •	floor
// •	level
// •	storey
// •	story
// •	basement
// •	ground floor
// •	mezzanine
// •	roof level
// When no floor or level is explicitly stated, always return:
// "levelIdentifier": null
// Never omit levelIdentifier.
// Space type
// Return the explicitly stated room or space category in normalized form.
// Choose exactly one of:
// •	apartment_storage
// •	balcony
// •	bathroom
// •	bedroom
// •	bicycle_storage
// •	corridor
// •	entrance_hall
// •	kitchen
// •	kitchenette
// •	laundry_room
// •	living_bedroom
// •	living_room
// •	sauna
// •	stairwell
// •	technical_room
// •	utility_room
// •	walk_in_closet
// •	wc
// •	generic_room
// •	other
// Normalize clearly equivalent spoken terms to the database-aligned value.
// Examples:
// •	"toilet" → "wc"
// •	"WC" → "wc"
// •	"entrance" → "entrance_hall"
// •	"entrance hall" → "entrance_hall"
// •	"hallway" → "corridor" when it clearly refers to a shared passage
// •	"small kitchen" → "kitchenette" only when the wording clearly identifies a kitchenette
// •	"kitchenette" → "kitchenette"
// •	"laundry" → "laundry_room"
// •	"laundry room" → "laundry_room"
// •	"bike storage" → "bicycle_storage"
// •	"bicycle room" → "bicycle_storage"
// •	"apartment storage area" → "apartment_storage"
// •	"walk-in wardrobe" → "walk_in_closet"
// •	"walk-in closet" → "walk_in_closet"
// •	"living room" → "living_room"
// •	"living room and sleeping area" → "living_bedroom"
// •	"studio sleeping area" → "living_bedroom" only when the combined space is clearly stated
// •	"fourth floor corridor" → "corridor"
// •	"Apartment 504 kitchen" → "kitchen"
// •	"technical room" → "technical_room"
// •	"staircase B" → "stairwell"
// Use "generic_room" only when the transcript explicitly says "room" without identifying a more specific room type.
// Use "other" only when an explicit room or space is stated but it does not fit any available category.
// Use null when no room or space type is explicitly stated.
// Determine spaceType only from explicitly spoken location wording.
// Do not infer spaceType from the defective object, work type, apartment layout, user context, or database knowledge.
// Examples:
// •	"kitchen socket":
// o	spaceType = "kitchen"
// o	workType = "electrical"
// •	"bathroom tile":
// o	spaceType = "bathroom"
// o	workType = "tiling"
// •	"corridor light fixture":
// o	spaceType = "corridor"
// o	workType = "electrical"
// A floor, apartment, unit, building, project, site, or relative object position is not by itself a spaceType.
// Examples:
// •	"Apartment 405" → spaceType = null
// •	"fourth floor" → spaceType = null
// •	"Building 2B" → spaceType = null
// •	"Alppila" → spaceType = null
// •	"under the sink" → do not use "sink" as spaceType
// When no room or space type is explicitly stated, always return:
// "spaceType": null
// Never omit spaceType.
// Timeframe
// Return only an explicitly spoken time or deadline expression, such as:
// •	today
// •	tomorrow
// •	by Friday
// •	next week
// Use null when no explicit timeframe is stated.
// Do not calculate, expand, or normalize the date.
// Priority words are not timeframes.
// Examples:
// •	"urgent" → timeframe = null
// •	"high priority" → timeframe = null
// •	"as soon as possible" → return the spoken wording only when it is clearly used as a timing instruction; otherwise return null
// Always include timeframe, even when its value is null.
// Work type
// Choose the construction trade most likely needed for the physical issue.
// Determine workType from:
// 1.	the defective object;
// 2.	the problem or condition affecting that object.
// Do not determine workType from the room, space, apartment, floor, building, project, site, user role, or location wording alone.
// Choose exactly one of:
// •	general_construction
// •	painting_finishing
// •	plumbing
// •	electrical
// •	hvac_ventilation
// •	tiling
// •	sealing_waterproofing
// •	doors_windows
// •	cleaning
// •	flooring
// Use null when the physical issue does not clearly identify a work type.
// Do not guess a work type from vague wording such as "something is damaged".
// Use general_construction only when no more specific listed work type clearly fits the defective object or problem.
// Do not use general_construction merely as a default.
// Work-type guidance:
// •	sockets, switches, lights, light fixtures, lighting, cables, wiring, and electrical panels → electrical
// •	pipes, drains, sinks, toilets, taps, faucets, and visible plumbing leaks → plumbing
// •	ventilation, airflow, vents, radiators, heating, cooling, and thermostats → hvac_ventilation
// •	tiles and grout → tiling
// •	silicone, sealants, waterproofing, membranes, and wet-area sealing → sealing_waterproofing
// •	doors, windows, handles, locks, hinges, and door or window adjustment problems → doors_windows
// •	dust, waste, debris, rubbish, and final cleaning → cleaning
// •	laminate, parquet, vinyl, flooring, floor coverings, and skirting boards → flooring
// •	paint damage, peeling paint, scratches on painted surfaces, repainting, and poor surface finishes → painting_finishing
// •	non-specialist building repairs or construction work that does not clearly belong to another listed trade → general_construction
// Examples:
// •	a socket in a bathroom → electrical, not plumbing
// •	a light in a kitchen → electrical
// •	loose cables near an entrance → electrical
// •	a dirty floor → cleaning, not flooring
// •	a cracked floor tile → tiling, not flooring
// •	water collecting under a sink → plumbing
// •	a damaged window → doors_windows
// •	a missing skirting board → flooring, not general_construction
// •	a scratched painted wall → painting_finishing
// •	a loose temporary safety railing → general_construction
// An explicitly named contractor does not override the physical issue.
// Example:
// •	"The kitchen tap is leaking. Assign it to the electrical contractor." → workType = "plumbing"
// Always include workType, even when its value is null.
// Required action
// Choose the most appropriate corrective-action code for the issue.
// Choose exactly one of:
// •	action_inspect
// •	action_repair
// •	action_replace
// •	action_install
// •	action_complete
// •	action_adjust
// •	action_secure
// •	action_clean
// •	action_remove
// •	action_unblock
// •	action_seal
// •	action_apply_grout
// •	action_paint
// •	action_repaint
// •	action_fill_and_paint
// •	action_sand
// •	action_test
// Determine requiredAction from:
// 1.	an explicitly spoken requested action;
// 2.	the defective object;
// 3.	the problem or condition affecting the object;
// 4.	the selected workType.
// Work type is supporting context. Do not determine requiredAction from work type alone.
// Prefer an explicitly spoken action when it clearly maps to one allowed action and does not contradict the physical issue.
// action_inspect
// Use when investigation is required before the corrective work can be determined.
// Examples:
// •	the source of the leak is unknown
// •	waterproofing needs inspection
// •	airflow must be checked
// •	the reason for the malfunction is unclear
// Do not use action_inspect when the corrective action is already obvious.
// action_repair
// Use for a general defect that needs correction when no more specific action clearly applies.
// Examples:
// •	leaking tap
// •	damaged handle
// •	malfunctioning light
// •	damaged floor surface
// •	broken connection
// Do not use action_repair when replace, adjust, secure, unblock, seal, or another more precise action clearly applies.
// action_replace
// Use when a defective component clearly needs replacement.
// Examples:
// •	cracked tile
// •	broken socket cover
// •	shattered window pane
// •	damaged door handle that cannot reasonably be repaired
// •	damaged floorboard
// Do not infer replacement from the word "damaged" alone when repair may still be appropriate.
// action_install
// Use when an expected physical component is missing or has not been installed.
// Examples:
// •	missing skirting board
// •	missing light fixture
// •	missing ventilation valve
// •	missing door handle
// action_complete
// Use when work has started but remains incomplete, unfinished, or not properly completed.
// Examples:
// •	unfinished wall opening
// •	incomplete flooring installation
// •	incomplete painting work
// •	unfinished service connection
// action_adjust
// Use when an installed component exists but needs alignment, calibration, balancing, or configuration.
// Examples:
// •	door does not close properly
// •	window needs alignment
// •	airflow is incorrect
// •	thermostat requires adjustment
// action_secure
// Use when an object is loose, detached, hanging, unstable, or improperly fastened.
// Examples:
// •	loose socket
// •	hanging light fixture
// •	loose railing
// •	loose ventilation valve
// •	detached skirting board
// action_clean
// Use when a surface or area requires cleaning.
// Examples:
// •	construction dust remains
// •	floor is dirty
// •	apartment needs final cleaning
// •	paint splashes remain on a surface
// action_remove
// Use when unwanted objects, materials, waste, or debris must be removed.
// Examples:
// •	waste remains in the corridor
// •	construction debris blocks the entrance
// •	unused materials must be removed
// •	rubbish remains in the room
// action_unblock
// Use when a flow path or opening is blocked.
// Examples:
// •	blocked drain
// •	blocked toilet
// •	blocked ventilation duct
// action_seal
// Use for missing or defective silicone, sealant, waterproofing joints, or sealing details.
// Examples:
// •	missing silicone around the shower
// •	damaged balcony-door seal
// •	unsealed pipe penetration
// •	incomplete waterproofing joint
// action_apply_grout
// Use when grout is missing, incomplete, damaged, or needs renewal.
// Examples:
// •	missing grout beside the shower
// •	damaged grout between tiles
// •	incomplete tile joints
// action_paint
// Use when an unpainted or newly prepared surface needs its initial paint application.
// Examples:
// •	wall has not been painted
// •	repaired surface requires paint
// •	ceiling requires painting
// action_repaint
// Use when existing paint is damaged, peeling, scratched, uneven, or unacceptable.
// Examples:
// •	peeling paint
// •	visible paint damage
// •	scratched painted wall
// •	uneven existing paint
// action_fill_and_paint
// Use when a surface defect clearly requires filling or putty work followed by painting.
// Examples:
// •	hole in a painted wall
// •	deep wall scratch
// •	damaged plaster requiring filling
// •	visible joint requiring putty and paint
// action_sand
// Use when sanding is the actual required corrective work.
// Examples:
// •	rough painted surface
// •	raised joint
// •	uneven filler
// •	surface requires sanding
// action_test
// Use when a component or system must be functionally tested.
// Examples:
// •	test the socket
// •	test the lighting circuit
// •	test the ventilation airflow
// •	test the water connection
// Use action_test mainly when testing is explicitly requested or clearly required.
// Do not automatically assign action_test to every electrical, plumbing, or HVAC issue.
// When no explicit action is spoken, infer an action only when the physical issue strongly supports one allowed action.
// Do not force every issue into an action.
// Examples:
// •	vague wording such as "something is wrong" → requiredAction = null
// •	a defect with insufficient information to distinguish repair from replacement → requiredAction = "action_repair" only when general repair is a reasonable representation; otherwise return null
// •	an issue requiring an unsupported specialist action → return null rather than inventing a value
// When no allowed action clearly fits, always return:
// "requiredAction": null
// Never omit requiredAction.
// Tags
// Return zero or more supported task-tag codes justified by explicit wording or by the clear meaning of the issue.
// Choose only from:
// •	tag_environment
// •	tag_health
// •	tag_induction
// •	tag_fire_stopping
// •	tag_quality
// •	tag_safety
// Return tags as a JSON array.
// Examples:
// •	one tag → ["tag_quality"]
// •	multiple tags → ["tag_quality", "tag_safety"]
// •	no supported tag → []
// Do not invent tag values.
// Do not return duplicate tags.
// An explicitly spoken tag or category is strong evidence.
// Examples:
// •	"mark this as a quality issue" → include "tag_quality"
// •	"this is a safety issue" → include "tag_safety"
// •	"tag this as an environmental issue" → include "tag_environment"
// Tags may also be inferred when the issue clearly belongs to a supported category.
// tag_quality
// Use tag_quality for a clear construction defect, nonconformance, incomplete work, damaged component, missing component, installation defect, poor finish, malfunction, or unacceptable workmanship.
// Examples:
// •	cracked tile
// •	damaged paint
// •	missing skirting board
// •	leaking tap
// •	light not working
// •	door does not close
// •	loose fixture
// Do not use tag_quality for a transcript that does not clearly describe a defect, task, or nonconformance.
// tag_safety
// Use tag_safety when the issue creates or clearly describes:
// •	a hazard
// •	an unsafe condition
// •	a fall risk
// •	a tripping risk
// •	electrical exposure
// •	unsecured protection
// •	blocked safe passage
// •	danger to workers or occupants
// Examples:
// •	exposed electrical cables
// •	loose temporary railing
// •	tripping hazard
// •	open shaft
// •	damaged fall protection
// •	hanging heavy fixture
// Do not tag every electrical or construction issue as tag_safety. There must be an actual or clearly implied safety concern.
// tag_health
// Use tag_health for issues involving:
// •	harmful dust
// •	mould
// •	moisture-related health concerns
// •	poor indoor air
// •	ventilation-related health concerns
// •	sanitation risks
// •	another clear worker or occupant health risk
// Do not tag every cleaning, moisture, or ventilation issue as tag_health unless a health concern is clearly present or strongly implied.
// tag_environment
// Use tag_environment for:
// •	environmental spills
// •	oil leaks
// •	chemical releases
// •	waste-handling problems
// •	recycling problems
// •	contamination
// •	leakage into soil, ground, drainage, or the external environment
// Do not use tag_environment for an ordinary indoor plumbing leak unless environmental impact is explicitly stated or clearly described.
// tag_fire_stopping
// Use tag_fire_stopping only for:
// •	fire-stopping work
// •	fire seals
// •	fire barriers
// •	fire-rated penetration sealing
// •	missing fire-stop material
// •	an explicitly stated fire-stopping issue
// Do not use tag_fire_stopping for ordinary door seals, window seals, silicone, acoustic sealing, or waterproofing.
// tag_induction
// Use tag_induction only for:
// •	site induction
// •	worker orientation
// •	safety onboarding
// •	training requirements
// •	related instruction tasks
// Work type alone is not sufficient evidence for a tag.
// Multiple tags may be returned when multiple supported categories clearly apply.
// Examples:
// •	loose temporary railing → ["tag_quality", "tag_safety"]
// •	exposed electrical cables causing a tripping hazard → ["tag_quality", "tag_safety"]
// •	cracked bathroom tile → ["tag_quality"]
// •	missing fire stopping around a cable penetration → ["tag_quality", "tag_fire_stopping"]
// •	oil spill near the entrance → ["tag_environment", "tag_safety"]
// •	site-induction training reminder → ["tag_induction"]
// When no supported tag clearly applies, always return:
// "tags": []
// Never omit tags.
// General rules
// •	Return exactly ten fields.
// •	Every field must always be present.
// •	Use null for unavailable scalar information.
// •	Use an empty array when no supported tag applies.
// •	Never omit buildingIdentifier.
// •	Never omit unitIdentifier.
// •	Never omit levelIdentifier.
// •	Never omit spaceType.
// •	Never omit location.
// •	Never omit timeframe.
// •	Never omit workType.
// •	Never omit requiredAction.
// •	Never omit tags.
// •	Do not confuse buildingIdentifier, unitIdentifier, and levelIdentifier.
// •	Do not infer a building from a site, apartment, unit, or floor.
// •	Do not infer a floor from an apartment or unit number.
// •	Do not infer a space type from the issue or database context.
// •	Do not determine workType from location alone.
// •	Do not determine requiredAction from workType alone.
// •	Do not invent missing information.
// •	Do not invent action codes.
// •	Do not invent tag codes.
// •	Do not silently correct explicitly spoken identifiers.
// •	Do not omit explicitly stated proper names.
// •	Do not repeat location information inside issue.
// •	Do not place room or space information inside issue unless it is part of the defective object itself.
// •	Do not add explanations.
// •	Return only the JSON object required by the supplied schema.
// •	Do not include markdown or code fences.
// Example 1
// Transcript:
// "The bedroom window is damaged in Apartment 405."
// Output:
// { “issue”: “damaged window”, “location”: “Apartment 405 bedroom”, “buildingIdentifier”: null, “unitIdentifier”: “405”, “levelIdentifier”: null, “spaceType”: “bedroom”, “timeframe”: null, “workType”: “doors_windows”, “requiredAction”: “action_repair”, “tags”: [“tag_quality”] }
// Example 2
// Transcript:
// "At Alppila, the socket in the bathroom of unit 204 is loose today."
// Output:
// { “issue”: “loose socket”, “location”: “Alppila, unit 204 bathroom”, “buildingIdentifier”: null, “unitIdentifier”: “204”, “levelIdentifier”: null, “spaceType”: “bathroom”, “timeframe”: “today”, “workType”: “electrical”, “requiredAction”: “action_secure”, “tags”: [“tag_quality”, “tag_safety”] }
// Example 3
// Transcript:
// "Something is damaged near the entrance."
// Output:
// { “issue”: “damaged object”, “location”: “near the entrance”, “buildingIdentifier”: null, “unitIdentifier”: null, “levelIdentifier”: null, “spaceType”: “entrance_hall”, “timeframe”: null, “workType”: null, “requiredAction”: null, “tags”: [“tag_quality”] }
// Example 4
// Transcript:
// "Water is collecting under the sink in Apartment 504 kitchen."
// Output:
// { “issue”: “water collecting under the sink”, “location”: “Apartment 504 kitchen”, “buildingIdentifier”: null, “unitIdentifier”: “504”, “levelIdentifier”: null, “spaceType”: “kitchen”, “timeframe”: null, “workType”: “plumbing”, “requiredAction”: “action_repair”, “tags”: [“tag_quality”] }
// Example 5
// Transcript:
// "The light fixture in the fourth floor corridor is hanging loose. Assign this to the electrical contractor."
// Output:
// { “issue”: “loose light fixture”, “location”: “fourth floor corridor”, “buildingIdentifier”: null, “unitIdentifier”: null, “levelIdentifier”: “4”, “spaceType”: “corridor”, “timeframe”: null, “workType”: “electrical”, “requiredAction”: “action_secure”, “tags”: [“tag_quality”, “tag_safety”] }
// Example 6
// Transcript:
// "The skirting board is missing from the living room wall in apartment D401."
// Output:
// { “issue”: “missing skirting board”, “location”: “apartment D401 living room”, “buildingIdentifier”: null, “unitIdentifier”: “D401”, “levelIdentifier”: null, “spaceType”: “living_room”, “timeframe”: null, “workType”: “flooring”, “requiredAction”: “action_install”, “tags”: [“tag_quality”] }
// Example 7
// Transcript:
// "The temporary railing in staircase B on the third floor is loose. Mark this as urgent."
// Output:
// { “issue”: “loose temporary railing”, “location”: “staircase B third floor”, “buildingIdentifier”: null, “unitIdentifier”: null, “levelIdentifier”: “3”, “spaceType”: “stairwell”, “timeframe”: null, “workType”: “general_construction”, “requiredAction”: “action_secure”, “tags”: [“tag_quality”, “tag_safety”] }
// The word "urgent" expresses priority, not an explicit timeframe.
// Example 8
// Transcript:
// "The kitchen wall in apartment B115 has visible paint damage near the window."
// Output:
// { “issue”: “visible paint damage”, “location”: “apartment B115 kitchen near the window”, “buildingIdentifier”: null, “unitIdentifier”: “B115”, “levelIdentifier”: null, “spaceType”: “kitchen”, “timeframe”: null, “workType”: “painting_finishing”, “requiredAction”: “action_repaint”, “tags”: [“tag_quality”] }
// Example 9
// Transcript:
// "The balcony door in apartment C204 does not close properly and cold air is coming through the seal."
// Output:
// { “issue”: “door does not close properly and cold air is coming through the seal”, “location”: “apartment C204 balcony”, “buildingIdentifier”: null, “unitIdentifier”: “C204”, “levelIdentifier”: null, “spaceType”: “balcony”, “timeframe”: null, “workType”: “doors_windows”, “requiredAction”: “action_adjust”, “tags”: [“tag_quality”] }
// Example 10
// Transcript:
// "There are loose cables near the main entrance walkway. This may cause a tripping hazard."
// Output:
// { “issue”: “loose cables”, “location”: “near the main entrance walkway”, “buildingIdentifier”: null, “unitIdentifier”: null, “levelIdentifier”: null, “spaceType”: “entrance_hall”, “timeframe”: null, “workType”: “electrical”, “requiredAction”: “action_secure”, “tags”: [“tag_quality”, “tag_safety”] }
// Example 11
// Transcript:
// "The handrail in the third-floor stairwell of Triolintie 2B is loose."
// Output:
// { “issue”: “loose handrail”, “location”: “Triolintie 2B third-floor stairwell”, “buildingIdentifier”: “2B”, “unitIdentifier”: null, “levelIdentifier”: “3”, “spaceType”: “stairwell”, “timeframe”: null, “workType”: “general_construction”, “requiredAction”: “action_secure”, “tags”: [“tag_quality”, “tag_safety”] }
// Example 12
// Transcript:
// "The kitchen tap in apartment 504 of Building 2B is leaking."
// Output:
// { “issue”: “leaking kitchen tap”, “location”: “Building 2B apartment 504 kitchen”, “buildingIdentifier”: “2B”, “unitIdentifier”: “504”, “levelIdentifier”: null, “spaceType”: “kitchen”, “timeframe”: null, “workType”: “plumbing”, “requiredAction”: “action_repair”, “tags”: [“tag_quality”] }
// Example 13
// Transcript:
// "At Triolintie 2, the light in the fourth-floor corridor is loose."
// Output:
// { “issue”: “loose light”, “location”: “Triolintie 2 fourth-floor corridor”, “buildingIdentifier”: null, “unitIdentifier”: null, “levelIdentifier”: “4”, “spaceType”: “corridor”, “timeframe”: null, “workType”: “electrical”, “requiredAction”: “action_secure”, “tags”: [“tag_quality”, “tag_safety”] }
// Triolintie 2 is preserved as a site or address clue, but it is not returned as a building identifier.
// Example 14
// Transcript:
// "At Triolintie 2B, the ventilation in the basement technical room is not working."
// Output:
// { “issue”: “ventilation not working”, “location”: “Triolintie 2B basement technical room”, “buildingIdentifier”: “2B”, “unitIdentifier”: null, “levelIdentifier”: “basement”, “spaceType”: “technical_room”, “timeframe”: null, “workType”: “hvac_ventilation”, “requiredAction”: “action_repair”, “tags”: [“tag_quality”] }
// Example 15
// Transcript:
// "The bathroom drain in apartment 204 is blocked."
// Output:
// { “issue”: “blocked drain”, “location”: “apartment 204 bathroom”, “buildingIdentifier”: null, “unitIdentifier”: “204”, “levelIdentifier”: null, “spaceType”: “bathroom”, “timeframe”: null, “workType”: “plumbing”, “requiredAction”: “action_unblock”, “tags”: [“tag_quality”] }
// Example 16
// Transcript:
// "Grout is missing beside the shower in apartment 302 bathroom."
// Output:
// { “issue”: “missing grout beside the shower”, “location”: “apartment 302 bathroom”, “buildingIdentifier”: null, “unitIdentifier”: “302”, “levelIdentifier”: null, “spaceType”: “bathroom”, “timeframe”: null, “workType”: “tiling”, “requiredAction”: “action_apply_grout”, “tags”: [“tag_quality”] }
// Example 17
// Transcript:
// "Construction dust remains in the shared corridor on the seventh floor."
// Output:
// { “issue”: “construction dust”, “location”: “seventh floor shared corridor”, “buildingIdentifier”: null, “unitIdentifier”: null, “levelIdentifier”: “7”, “spaceType”: “corridor”, “timeframe”: null, “workType”: “cleaning”, “requiredAction”: “action_clean”, “tags”: [“tag_quality”, “tag_health”] }
// Example 18
// Transcript:
// "Silicone is missing around the shower in apartment 504 bathroom."
// Output:
// { “issue”: “missing silicone around the shower”, “location”: “apartment 504 bathroom”, “buildingIdentifier”: null, “unitIdentifier”: “504”, “levelIdentifier”: null, “spaceType”: “bathroom”, “timeframe”: null, “workType”: “sealing_waterproofing”, “requiredAction”: “action_seal”, “tags”: [“tag_quality”] }
// `




export const MistralInstructions = `
Extract one or more construction issues from the transcript.
Return exactly one JSON object with this shape:
{
"issues": [
{
"issue": string,
"location": string | null,
"buildingIdentifier": string | null,
"unitIdentifier": string | null,
"levelIdentifier": string | null,
"spaceType": string | null,
"timeframe": string | null,
"workType": string | null,
"requiredAction": string | null,
"tags": string[]
}
]
}
The root object must contain only:
•	issues
Do not return:
•	sharedContext
•	multiIssueDetected
•	issueCount
•	confidence
•	splitReason
•	notes
•	needsUserReview
•	explanations
The app will calculate issue count and review status itself.
Each item in issues represents one independent construction issue and will become one separate draft form.
Every issue object must always contain all ten fields:
•	issue
•	location
•	buildingIdentifier
•	unitIdentifier
•	levelIdentifier
•	spaceType
•	timeframe
•	workType
•	requiredAction
•	tags
For unavailable scalar information, return null.
For tags, return an empty array when no supported tag applies.
Never omit a required field.
Do not add explanations.
Return only the JSON object required by the supplied schema.
Do not include markdown or code fences.
Multi-issue rules
A transcript may contain one issue or multiple issues.
Create one issue object for each independent physical construction problem.
Split into multiple issues when the transcript describes:
•	two or more different physical defects
•	two or more different defective objects
•	two or more different work trades
•	two or more different responsible work types
•	two or more different locations with different problems
•	one issue introduced after wording such as “also”, “and”, “another thing”, “second”, “plus”, “as well”, or similar wording, when it clearly describes a new problem
Do not split when the second phrase only describes:
•	the consequence of the same issue
•	the urgency of the same issue
•	the required action for the same issue
•	the deadline for the same issue
•	extra detail about the same defective object
•	the same problem in different words
Each issue must be complete enough to create one draft form.
Do not use shared context.
If two issues share the same apartment, building, floor, or room, repeat that location information inside each issue object.
If two issues are in different apartments, buildings, floors, or rooms, keep the location fields separate for each issue.
Do not copy a location from one issue to another unless the transcript clearly states that the same location applies to both.
Issue
Return only the physical problem or defective object for this specific issue.
Remove project, site, building, floor, apartment, unit, room, space, area, and time information from the issue.
Keep the wording short while preserving the original meaning.
Examples:
•	“the socket is loose” → “loose socket”
•	“the door does not close” → “door does not close”
•	“the bathroom tile is cracked” → “cracked tile”
•	“the skirting board is missing from the living room” → “missing skirting board”
Do not reverse negation or change the meaning of the defect.
Do not combine two independent issues into one issue string.
Location
Return all explicitly spoken location clues for this specific issue.
Location clues may include:
•	project or site name
•	address
•	building, block, or tower
•	floor or level
•	apartment, flat, or unit
•	room or space
•	area
•	relative location wording
Preserve explicitly spoken proper names such as Alppila and Triolintie 2B.
Do not omit a broader named location because a more specific building, apartment, unit, room, or space is also stated.
Room and space words such as bathroom, toilet, WC, kitchen, kitchenette, living room, sleeping area, bedroom, corridor, hallway, stairwell, sauna, balcony, entrance hall, storage area, bicycle storage, laundry room, technical room, utility room, and walk-in closet belong to location, even when they appear directly before the defective object.
Examples:
•	“bedroom window” means the issue concerns a window and location includes “bedroom”.
•	“bathroom socket” means the issue concerns a socket and location includes “bathroom”.
•	“at Alppila in unit 204 bathroom” means location must preserve “Alppila”, “unit 204”, and “bathroom”.
•	“in Triolintie 2B on the fourth floor” means location must preserve “Triolintie 2B” and “fourth floor”.
•	“under the sink in Apartment 504 kitchen” means location includes “Apartment 504 kitchen”.
Use null when no location is explicitly stated for this issue.
Building identifier
Return only an explicitly stated building, block, or tower identifier for this specific issue.
Return the identifier without words such as building, block, or tower.
Examples:
•	“Building 2B” → “2B”
•	“building B” → “B”
•	“Block 2B” → “2B”
•	“Tower A” → “A”
•	“Triolintie 2B” → “2B”
•	“the 2B building” → “2B”
Preserve meaningful letters, digits, and separators.
Do not infer the building from an apartment, unit, floor, site, project, or active application context.
Examples:
•	“Triolintie 2” → buildingIdentifier = null
•	“Alppila” → buildingIdentifier = null
•	“staircase B” → buildingIdentifier = null
•	“Apartment B204” → buildingIdentifier = null
•	“unit 204” → buildingIdentifier = null
•	“Bedroom 2” → buildingIdentifier = null
•	“Floor 2” → buildingIdentifier = null
•	“corridor B” → buildingIdentifier = null
When no building, block, or tower identifier is explicitly stated for this issue, return null.
Unit identifier
Return only an explicitly stated apartment, flat, or unit identifier for this specific issue.
Return the identifier without words such as apartment, unit, flat, or residence.
Examples:
•	“Apartment 504” → “504”
•	“unit 204” → “204”
•	“apartment B115” → “B115”
•	“Apartment C204” → “C204”
•	“flat D401” → “D401”
•	“unit A-204” → “A-204”
Preserve all meaningful letters, digits, and separators.
Only return a value when the identifier is explicitly connected to an apartment, unit, or flat.
Do not extract identifiers belonging to other location types.
Examples:
•	“staircase B” → unitIdentifier = null
•	“Building B” → unitIdentifier = null
•	“Triolintie 2B” → unitIdentifier = null
•	“third floor” → unitIdentifier = null
•	“room 204” → unitIdentifier = null
•	“corridor 4” → unitIdentifier = null
When no apartment, flat, or unit identifier is explicitly stated for this issue, return null.
Level identifier
Return the explicitly stated floor or level identifier for this specific issue in normalized form.
The complete floor or level wording must still remain inside location.
Convert clearly stated written numbers and ordinal numbers into compact identifiers.
Examples:
•	“fourth floor” → “4”
•	“the fourth-floor corridor” → “4”
•	“floor four” → “4”
•	“floor 4” → “4”
•	“level four” → “4”
•	“level 3” → “3”
•	“first floor” → “1”
•	“second level” → “2”
•	“seventh storey” → “7”
Preserve meaningful non-numeric level identifiers.
Examples:
•	“ground floor” → “ground”
•	“basement” → “basement”
•	“basement level one” → “B1”
•	“basement floor 2” → “B2”
•	“mezzanine” → “mezzanine”
•	“roof level” → “roof”
Do not infer a floor from an apartment or unit identifier.
Examples:
•	“Apartment 405” → levelIdentifier = null
•	“unit 504” → levelIdentifier = null
•	“unit B115” → levelIdentifier = null
•	“room 204” → levelIdentifier = null
•	“Building 4” → levelIdentifier = null
•	“corridor 4” → levelIdentifier = null
When no floor or level is explicitly stated for this issue, return null.
Space type
Return the explicitly stated room or space category for this specific issue in normalized form.
Choose exactly one of:
•	apartment_storage
•	balcony
•	bathroom
•	bedroom
•	bicycle_storage
•	corridor
•	entrance_hall
•	kitchen
•	kitchenette
•	laundry_room
•	living_bedroom
•	living_room
•	sauna
•	stairwell
•	technical_room
•	utility_room
•	walk_in_closet
•	wc
•	generic_room
•	other
Use null when no room or space type is explicitly stated for this issue.
Determine spaceType only from explicitly spoken location wording.
Do not infer spaceType from the defective object, work type, apartment layout, user context, or database knowledge.
Examples:
•	“kitchen socket” → spaceType = “kitchen”, workType = “electrical”
•	“bathroom tile” → spaceType = “bathroom”, workType = “tiling”
•	“corridor light fixture” → spaceType = “corridor”, workType = “electrical”
•	“Apartment 405” → spaceType = null
•	“fourth floor” → spaceType = null
•	“Building 2B” → spaceType = null
•	“under the sink” → do not use “sink” as spaceType
Timeframe
Return only an explicitly spoken time or deadline expression for this specific issue.
Examples:
•	today
•	tomorrow
•	by Friday
•	next week
Do not calculate, expand, or normalize the date.
Priority words are not timeframes.
Examples:
•	“urgent” → timeframe = null
•	“high priority” → timeframe = null
•	“as soon as possible” → return the spoken wording only when it is clearly used as a timing instruction; otherwise return null
Use null when no explicit timeframe is stated for this issue.
Work type
Choose the construction trade most likely needed for this specific physical issue.
Determine workType from:
1.	the defective object
2.	the problem or condition affecting that object
Do not determine workType from the room, space, apartment, floor, building, project, site, user role, or location wording alone.
Choose exactly one of:
•	general_construction
•	painting_finishing
•	plumbing
•	electrical
•	hvac_ventilation
•	tiling
•	sealing_waterproofing
•	doors_windows
•	cleaning
•	flooring
Use null when the physical issue does not clearly identify a work type.
Use general_construction only when no more specific listed work type clearly fits the defective object or problem.
Do not use general_construction merely as a default.
Work-type guidance:
•	sockets, switches, lights, light fixtures, lighting, cables, wiring, and electrical panels → electrical
•	pipes, drains, sinks, toilets, taps, faucets, and visible plumbing leaks → plumbing
•	ventilation, airflow, vents, radiators, heating, cooling, and thermostats → hvac_ventilation
•	tiles and grout → tiling
•	silicone, sealants, waterproofing, membranes, and wet-area sealing → sealing_waterproofing
•	doors, windows, handles, locks, hinges, and door or window adjustment problems → doors_windows
•	dust, waste, debris, rubbish, and final cleaning → cleaning
•	laminate, parquet, vinyl, flooring, floor coverings, and skirting boards → flooring
•	paint damage, peeling paint, scratches on painted surfaces, repainting, and poor surface finishes → painting_finishing
•	non-specialist building repairs or construction work that does not clearly belong to another listed trade → general_construction
An explicitly named contractor does not override the physical issue.
Example:
•	“The kitchen tap is leaking. Assign it to the electrical contractor.” → workType = “plumbing”
Required action
Choose the most appropriate corrective-action code for this specific issue.
Choose exactly one of:
•	action_inspect
•	action_repair
•	action_replace
•	action_install
•	action_complete
•	action_adjust
•	action_secure
•	action_clean
•	action_remove
•	action_unblock
•	action_seal
•	action_apply_grout
•	action_paint
•	action_repaint
•	action_fill_and_paint
•	action_sand
•	action_test
Determine requiredAction from:
1.	an explicitly spoken requested action
2.	the defective object
3.	the problem or condition affecting the object
4.	the selected workType
Work type is supporting context. Do not determine requiredAction from work type alone.
Prefer an explicitly spoken action when it clearly maps to one allowed action and does not contradict the physical issue.
Use action_inspect when investigation is required before the corrective work can be determined.
Use action_repair for a general defect that needs correction when no more specific action clearly applies.
Use action_replace when a defective component clearly needs replacement.
Use action_install when an expected physical component is missing or has not been installed.
Use action_complete when work has started but remains incomplete, unfinished, or not properly completed.
Use action_adjust when an installed component exists but needs alignment, calibration, balancing, or configuration.
Use action_secure when an object is loose, detached, hanging, unstable, or improperly fastened.
Use action_clean when a surface or area requires cleaning.
Use action_remove when unwanted objects, materials, waste, or debris must be removed.
Use action_unblock when a flow path or opening is blocked.
Use action_seal for missing or defective silicone, sealant, waterproofing joints, or sealing details.
Use action_apply_grout when grout is missing, incomplete, damaged, or needs renewal.
Use action_paint when an unpainted or newly prepared surface needs its initial paint application.
Use action_repaint when existing paint is damaged, peeling, scratched, uneven, or unacceptable.
Use action_fill_and_paint when a surface defect clearly requires filling or putty work followed by painting.
Use action_sand when sanding is the actual required corrective work.
Use action_test when a component or system must be functionally tested.
When no explicit action is spoken, infer an action only when the physical issue strongly supports one allowed action.
Do not force every issue into an action.
When no allowed action clearly fits, return null.
Tags
Return zero or more supported task-tag codes for this specific issue.
Choose only from:
•	tag_environment
•	tag_health
•	tag_induction
•	tag_fire_stopping
•	tag_quality
•	tag_safety
Return tags as a JSON array.
Do not invent tag values.
Do not return duplicate tags.
Use tag_quality for a clear construction defect, nonconformance, incomplete work, damaged component, missing component, installation defect, poor finish, malfunction, or unacceptable workmanship.
Use tag_safety when the issue creates or clearly describes a hazard, unsafe condition, fall risk, tripping risk, electrical exposure, unsecured protection, blocked safe passage, or danger to workers or occupants.
Use tag_health for harmful dust, mould, moisture-related health concerns, poor indoor air, ventilation-related health concerns, sanitation risks, or another clear worker or occupant health risk.
Use tag_environment for environmental spills, oil leaks, chemical releases, waste-handling problems, recycling problems, contamination, or leakage into soil, ground, drainage, or the external environment.
Use tag_fire_stopping only for fire-stopping work, fire seals, fire barriers, fire-rated penetration sealing, missing fire-stop material, or an explicitly stated fire-stopping issue.
Use tag_induction only for site induction, worker orientation, safety onboarding, training requirements, or related instruction tasks.
Work type alone is not sufficient evidence for a tag.
Multiple tags may be returned when multiple supported categories clearly apply.
When no supported tag clearly applies, return [].
General rules
•	Return exactly one root JSON object.
•	The root object must contain only issues.
•	issues must be an array.
•	issues must contain at least one issue object.
•	Each issue object must contain exactly the ten required fields.
•	Use null for unavailable scalar information.
•	Use an empty array when no supported tag applies.
•	Never omit location.
•	Never omit buildingIdentifier.
•	Never omit unitIdentifier.
•	Never omit levelIdentifier.
•	Never omit spaceType.
•	Never omit timeframe.
•	Never omit workType.
•	Never omit requiredAction.
•	Never omit tags.
•	Do not confuse buildingIdentifier, unitIdentifier, and levelIdentifier.
•	Do not infer a building from a site, apartment, unit, or floor.
•	Do not infer a floor from an apartment or unit number.
•	Do not infer a space type from the issue or database context.
•	Do not determine workType from location alone.
•	Do not determine requiredAction from workType alone.
•	Do not invent missing information.
•	Do not invent action codes.
•	Do not invent tag codes.
•	Do not silently correct explicitly spoken identifiers.
•	Do not omit explicitly stated proper names.
•	Do not repeat location information inside issue.
•	Do not place room or space information inside issue unless it is part of the defective object itself.
•	Do not add explanations.
•	Return only the JSON object required by the supplied schema.
•	Do not include markdown or code fences.
Examples
Example 1
Transcript:
“The bedroom window is damaged in Apartment 405.”
Output:
{
"issues": [
{
"issue": "damaged window",
"location": "Apartment 405 bedroom",
"buildingIdentifier": null,
"unitIdentifier": "405",
"levelIdentifier": null,
"spaceType": "bedroom",
"timeframe": null,
"workType": "doors_windows",
"requiredAction": "action_repair",
"tags": ["tag_quality"]
}
]
}
Example 2
Transcript:
“In apartment 301, the kitchen socket is missing and the bedroom wall paint is damaged.”
Output:
{
"issues": [
{
"issue": "missing socket",
"location": "apartment 301 kitchen",
"buildingIdentifier": null,
"unitIdentifier": "301",
"levelIdentifier": null,
"spaceType": "kitchen",
"timeframe": null,
"workType": "electrical",
"requiredAction": "action_install",
"tags": ["tag_quality"]
},
{
"issue": "damaged wall paint",
"location": "apartment 301 bedroom",
"buildingIdentifier": null,
"unitIdentifier": "301",
"levelIdentifier": null,
"spaceType": "bedroom",
"timeframe": null,
"workType": "painting_finishing",
"requiredAction": "action_repaint",
"tags": ["tag_quality"]
}
]
}
Example 3
Transcript:
“Apartment 301 has a bathroom leak and apartment 302 has a broken balcony door.”
Output:
{
"issues": [
{
"issue": "bathroom leak",
"location": "apartment 301 bathroom",
"buildingIdentifier": null,
"unitIdentifier": "301",
"levelIdentifier": null,
"spaceType": "bathroom",
"timeframe": null,
"workType": "plumbing",
"requiredAction": "action_repair",
"tags": ["tag_quality"]
},
{
"issue": "broken balcony door",
"location": "apartment 302 balcony",
"buildingIdentifier": null,
"unitIdentifier": "302",
"levelIdentifier": null,
"spaceType": "balcony",
"timeframe": null,
"workType": "doors_windows",
"requiredAction": "action_repair",
"tags": ["tag_quality"]
}
]
}
Example 4
Transcript:
“In apartment 301 bathroom, the pipe is leaking and the door does not close properly.”
Output:
{
"issues": [
{
"issue": "leaking pipe",
"location": "apartment 301 bathroom",
"buildingIdentifier": null,
"unitIdentifier": "301",
"levelIdentifier": null,
"spaceType": "bathroom",
"timeframe": null,
"workType": "plumbing",
"requiredAction": "action_repair",
"tags": ["tag_quality"]
},
{
"issue": "door does not close properly",
"location": "apartment 301 bathroom",
"buildingIdentifier": null,
"unitIdentifier": "301",
"levelIdentifier": null,
"spaceType": "bathroom",
"timeframe": null,
"workType": "doors_windows",
"requiredAction": "action_adjust",
"tags": ["tag_quality"]
}
]
}
Example 5
Transcript:
“The bathroom pipe is leaking and water is spreading on the floor.”
Output:
{
"issues": [
{
"issue": "leaking pipe",
"location": "bathroom",
"buildingIdentifier": null,
"unitIdentifier": null,
"levelIdentifier": null,
"spaceType": "bathroom",
"timeframe": null,
"workType": "plumbing",
"requiredAction": "action_repair",
"tags": ["tag_quality"]
}
]
}
Example 6
Transcript:
“The balcony door in apartment C204 does not close properly and cold air is coming through the seal.”
Output:
{
"issues": [
{
"issue": "door does not close properly and cold air is coming through the seal",
"location": "apartment C204 balcony",
"buildingIdentifier": null,
"unitIdentifier": "C204",
"levelIdentifier": null,
"spaceType": "balcony",
"timeframe": null,
"workType": "doors_windows",
"requiredAction": "action_adjust",
"tags": ["tag_quality"]
}
]
}
Example 7
Transcript:
“The temporary railing in staircase B on the third floor is loose. Mark this as urgent.”
Output:
{
"issues": [
{
"issue": "loose temporary railing",
"location": "staircase B third floor",
"buildingIdentifier": null,
"unitIdentifier": null,
"levelIdentifier": "3",
"spaceType": "stairwell",
"timeframe": null,
"workType": "general_construction",
"requiredAction": "action_secure",
"tags": ["tag_quality", "tag_safety"]
}
]
}
The word “urgent” expresses priority, not an explicit timeframe.
Example 8
Transcript:
“The light fixture in the fourth floor corridor is hanging loose and construction dust remains near the entrance.”
Output:
{
"issues": [
{
"issue": "loose light fixture",
"location": "fourth floor corridor",
"buildingIdentifier": null,
"unitIdentifier": null,
"levelIdentifier": "4",
"spaceType": "corridor",
"timeframe": null,
"workType": "electrical",
"requiredAction": "action_secure",
"tags": ["tag_quality", "tag_safety"]
},
{
"issue": "construction dust",
"location": "near the entrance",
"buildingIdentifier": null,
"unitIdentifier": null,
"levelIdentifier": null,
"spaceType": "entrance_hall",
"timeframe": null,
"workType": "cleaning",
"requiredAction": "action_clean",
"tags": ["tag_quality", "tag_health"]
}
]
}
`