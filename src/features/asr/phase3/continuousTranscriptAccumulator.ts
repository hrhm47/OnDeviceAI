const BASIC_PUNCTUATION_PATTERN = /[.,!?;:()[\]{}"'`]/g;

export class ContinuousTranscriptAccumulator {
  private committedTranscript = "";
  private activePartialTranscript = "";

  reset() {
    this.committedTranscript = "";
    this.activePartialTranscript = "";
  }

  update(nextText: string) {
    const text = cleanTranscriptText(nextText);
    if (!text) {
      return this.current();
    }

    if (this.isCompleteSessionTranscript(text)) {
      this.committedTranscript = "";
      this.activePartialTranscript = text;
      return this.current();
    }

    if (!this.activePartialTranscript) {
      this.activePartialTranscript = text;
      return this.current();
    }

    if (isLikelyPartialRevision(this.activePartialTranscript, text)) {
      this.activePartialTranscript = text;
      return this.current();
    }

    this.committedTranscript = joinTranscriptParts(
      this.committedTranscript,
      this.activePartialTranscript,
    );
    this.activePartialTranscript = text;
    return this.current();
  }

  finalize(finalText?: string | null) {
    if (finalText?.trim()) {
      this.update(finalText);
    }

    const transcript = this.current();
    this.committedTranscript = transcript;
    this.activePartialTranscript = "";
    return transcript;
  }

  current() {
    return joinTranscriptParts(
      this.committedTranscript,
      this.activePartialTranscript,
    );
  }

  private isCompleteSessionTranscript(text: string) {
    const normalizedText = normalizeForComparison(text);
    const normalizedCommitted = normalizeForComparison(this.committedTranscript);
    const normalizedCurrent = normalizeForComparison(this.current());

    return (
      (!!normalizedCommitted &&
        startsWithTranscript(normalizedText, normalizedCommitted)) ||
      (!!normalizedCurrent &&
        startsWithTranscript(normalizedText, normalizedCurrent))
    );
  }
}

function cleanTranscriptText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function joinTranscriptParts(first: string, second: string) {
  const left = cleanTranscriptText(first);
  const right = cleanTranscriptText(second);
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return `${left} ${right}`;
}

function isLikelyPartialRevision(previous: string, next: string) {
  const normalizedPrevious = normalizeForComparison(previous);
  const normalizedNext = normalizeForComparison(next);

  if (!normalizedPrevious || !normalizedNext) {
    return false;
  }

  if (
    startsWithTranscript(normalizedNext, normalizedPrevious) ||
    startsWithTranscript(normalizedPrevious, normalizedNext)
  ) {
    return true;
  }

  const previousTokens = normalizedPrevious.split(" ");
  const nextTokens = normalizedNext.split(" ");
  const previousUnique = new Set(previousTokens);
  const nextUnique = new Set(nextTokens);
  const sharedCount = [...previousUnique].filter((token) =>
    nextUnique.has(token),
  ).length;
  const smallerTokenCount = Math.min(previousUnique.size, nextUnique.size);

  if (smallerTokenCount === 0) {
    return false;
  }

  const overlapRatio = sharedCount / smallerTokenCount;
  const requiredOverlap = smallerTokenCount >= 4 ? 0.5 : 0.75;
  return overlapRatio >= requiredOverlap;
}

function startsWithTranscript(text: string, prefix: string) {
  return text === prefix || text.startsWith(`${prefix} `);
}

function normalizeForComparison(text: string) {
  return cleanTranscriptText(text)
    .toLowerCase()
    .replace(BASIC_PUNCTUATION_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}
