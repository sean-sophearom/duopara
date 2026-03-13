/** Split text into sentences on common sentence-ending punctuation. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?""»'។])\s+/).filter((s) => s.trim().length > 0);
}

/** Extract individual words from text, filtering out numbers and single chars. */
export function extractWords(text: string, _language: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^\d+$/.test(word));
}

/** Fisher-Yates shuffle (returns new array). */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
