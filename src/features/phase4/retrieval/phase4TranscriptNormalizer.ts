export const normalizePhase4RetrievalText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/.,:;()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const tokenizePhase4RetrievalText = (value: string) =>
  normalizePhase4RetrievalText(value)
    .split(" ")
    .filter((token) => token.length >= 2);
