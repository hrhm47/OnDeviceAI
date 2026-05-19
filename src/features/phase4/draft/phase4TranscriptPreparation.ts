export const preparePhase4Transcript = (input: {
  rawTranscript?: string | null;
  improvedTranscript?: string | null;
  transcript?: string | null;
}) => {
  const selected =
    firstNonEmpty(input.improvedTranscript) ??
    firstNonEmpty(input.rawTranscript) ??
    firstNonEmpty(input.transcript) ??
    "";

  return selected.replace(/\s+/g, " ").trim();
};

const firstNonEmpty = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
