/**
 * Normalizes text for ASR comparison:
 * 1. Lowercase
 * 2. Remove all punctuation
 * 3. Replace multiple spaces with a single space
 * 4. Trim edge whitespace
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s\']/g, '') // remove punctuation except apostrophes
    .replace(/\s+/g, ' ')      // remove extra spaces
    .trim();
};

export interface WERResult {
  wer: number; // Percentage (e.g. 15.5)
  substitutions: number;
  deletions: number;
  insertions: number;
  wordCount: number;
}

/**
 * Robust Word Error Rate calculation using the Levenshtein distance matching DP algorithm.
 * Returns an object with the percentage and the detailed S, D, I metrics.
 */
export const calculateWER = (referenceText: string, hypothesisText: string): WERResult => {
  const refWords = normalizeText(referenceText).split(' ').filter(Boolean);
  const hypWords = normalizeText(hypothesisText).split(' ').filter(Boolean);

  const m = refWords.length;
  const n = hypWords.length;

  // Edge cases
  if (m === 0 && n === 0) return { wer: 0, substitutions: 0, deletions: 0, insertions: 0, wordCount: 0 };
  if (m === 0) return { wer: 100, substitutions: 0, deletions: 0, insertions: n, wordCount: 0 };

  // dp[i][j] stores the edit distance between refWords[0...i-1] and hypWords[0...j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // Match
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // Substitution
          dp[i - 1][j] + 1,     // Deletion from ref
          dp[i][j - 1] + 1      // Insertion into hyp
        );
      }
    }
  }

  // To truly get exact S, D, I counts, we backtrack through the DP table
  let i = m;
  let j = n;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && refWords[i - 1] === hypWords[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++;
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      insertions++;
      j--;
    }
  }

  const wer = ((substitutions + deletions + insertions) / m) * 100;

  return {
    wer,
    substitutions,
    deletions,
    insertions,
    wordCount: m
  };
};

/**
 * Computes Time to First Symbol (TTFS) from start performance tracking.
 * @param startTime timestamp captured at start of function (performance.now())
 * @param firstSymbolTime timestamp captured when first length > 0 string arrives from engine
 */
export const calculateTTFS = (startTime: number, firstSymbolTime: number): number => {
  return firstSymbolTime - startTime;
};
