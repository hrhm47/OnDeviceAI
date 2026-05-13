const BASIC_PUNCTUATION = /[.,!?;:"()[\]{}<>/\\|@#$%^&*_+=~`´“”‘’–—-]/g;

export type ErrorRateResult = {
  distance: number;
  referenceLength: number;
  rate: number | null;
};

export const normalizeAsrScoringText = (text: string) =>
  text
    .toLocaleLowerCase()
    .replace(BASIC_PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();

export const calculateWordErrorRate = (
  normalizedReferenceText: string,
  normalizedRecognizedText: string,
): ErrorRateResult => {
  const referenceWords = normalizedReferenceText.split(" ").filter(Boolean);
  const recognizedWords = normalizedRecognizedText.split(" ").filter(Boolean);
  return calculateErrorRate(referenceWords, recognizedWords);
};

export const calculateCharacterErrorRate = (
  normalizedReferenceText: string,
  normalizedRecognizedText: string,
): ErrorRateResult => {
  const referenceChars = Array.from(normalizedReferenceText.replace(/\s+/g, ""));
  const recognizedChars = Array.from(normalizedRecognizedText.replace(/\s+/g, ""));
  return calculateErrorRate(referenceChars, recognizedChars);
};

const calculateErrorRate = (
  referenceTokens: string[],
  recognizedTokens: string[],
): ErrorRateResult => {
  if (!referenceTokens.length && !recognizedTokens.length) {
    return { distance: 0, referenceLength: 0, rate: 0 };
  }

  if (!referenceTokens.length) {
    return {
      distance: recognizedTokens.length,
      referenceLength: 0,
      rate: null,
    };
  }

  const distance = levenshteinDistance(referenceTokens, recognizedTokens);
  return {
    distance,
    referenceLength: referenceTokens.length,
    rate: distance / referenceTokens.length,
  };
};

const levenshteinDistance = (source: string[], target: string[]) => {
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  const current = new Array(target.length + 1).fill(0);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    current[0] = sourceIndex;

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const cost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      current[targetIndex] = Math.min(
        previous[targetIndex] + 1,
        current[targetIndex - 1] + 1,
        previous[targetIndex - 1] + cost,
      );
    }

    for (let index = 0; index <= target.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[target.length];
};
