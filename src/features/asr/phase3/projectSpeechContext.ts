export type ProjectSpeechContext = {
  englishTerms?: readonly string[];
  finnishTerms?: readonly string[];
  locations?: readonly string[];
  rooms?: readonly string[];
  issueTypes?: readonly string[];
  categories?: readonly string[];
  contractorRoles?: readonly string[];
  contractorNames?: readonly string[];
  urgencyWords?: readonly string[];
};

export const MAX_CONTEXTUAL_STRINGS_TOTAL = 90;
export const MAX_CONTEXTUAL_STRINGS_PER_LANGUAGE = 45;

export const EN_CONSTRUCTION_CONTEXTUAL_STRINGS_V1 = [
  "safety observation",
  "quality issue",
  "site inspection",
  "corrective action",
  "nonconformity",
  "high priority",
  "responsible contractor",
  "main contractor",
  "subcontractor",
  "plumbing contractor",
  "electrical contractor",
  "HVAC contractor",
  "fire stopping contractor",
  "apartment",
  "bathroom",
  "kitchen",
  "corridor",
  "staircase",
  "basement",
  "parking hall",
  "technical room",
  "roof",
  "facade",
  "floor slab",
  "water leak",
  "pipe leak",
  "moisture damage",
  "damp wall",
  "wet floor",
  "mold",
  "cracked tile",
  "concrete crack",
  "missing sealant",
  "loose railing",
  "blocked drain",
  "electrical fault",
  "exposed cable",
  "broken socket",
  "ventilation issue",
  "heating issue",
  "fire stopping",
  "waterproofing",
  "guardrail",
  "fall protection",
  "safety harness",
] as const;

export const FI_CONSTRUCTION_CONTEXTUAL_STRINGS_V1 = [
  "rakennustyömaa",
  "työmaa",
  "turvallisuushavainto",
  "laatuhavainto",
  "puute",
  "tarkastus",
  "työmaatarkastus",
  "laatutarkastus",
  "korjaustoimenpide",
  "kiireellinen",
  "korkea prioriteetti",
  "urakoitsija",
  "pääurakoitsija",
  "aliurakoitsija",
  "vastuuhenkilö",
  "putkiurakoitsija",
  "sähköurakoitsija",
  "LVI-urakoitsija",
  "asunto",
  "kylpyhuone",
  "keittiö",
  "käytävä",
  "portaikko",
  "kellari",
  "pysäköintihalli",
  "tekninen tila",
  "vesikatto",
  "julkisivu",
  "välipohja",
  "vesivuoto",
  "putkivuoto",
  "kosteusvaurio",
  "märkä lattia",
  "home",
  "betonihalkeama",
  "puuttuva tiivistys",
  "irronnut laatta",
  "tukkeutunut viemäri",
  "sähkövika",
  "palokatko",
  "ilmanvaihto",
  "LVI",
  "vedeneristys",
  "turvakaide",
  "putoamissuojaus",
] as const;

export const phase3ConstructionSpeechContext: ProjectSpeechContext = {
  englishTerms: EN_CONSTRUCTION_CONTEXTUAL_STRINGS_V1,
  finnishTerms: FI_CONSTRUCTION_CONTEXTUAL_STRINGS_V1,
};

export const demoProjectSpeechContext = phase3ConstructionSpeechContext;
