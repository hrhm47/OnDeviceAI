export type ProjectSpeechContext = {
  locations: string[];
  rooms: string[];
  issueTypes: string[];
  categories: string[];
  contractorRoles: string[];
  contractorNames: string[];
  urgencyWords: string[];
  finnishTerms: string[];
};

export const demoProjectSpeechContext: ProjectSpeechContext = {
  locations: ["A302", "A303", "Building A"],
  rooms: ["bathroom", "staircase"],
  issueTypes: ["water leak"],
  categories: ["safety", "plumbing", "electrical"],
  contractorRoles: ["plumbing contractor", "electrical contractor"],
  contractorNames: [],
  urgencyWords: ["urgent"],
  finnishTerms: ["vesivuoto", "kylpyhuone", "turvakaide"],
};
