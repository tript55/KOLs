/**
 * Content fingerprinting utilities for deduplication.
 * Uses trigram-based Jaccard similarity to detect similar content.
 */

/**
 * Compute a fingerprint string from text content.
 * Normalizes text, extracts trigrams (3-character shingles), returns sorted trigrams joined by '|'.
 */
export function computeFingerprint(text: string): string {
  if (!text || text.trim().length === 0) {
    return "";
  }

  // Normalize: lowercase, remove punctuation, collapse whitespace
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Keep letters, numbers, whitespace; replace punctuation
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length < 3) {
    return normalized;
  }

  // Extract trigrams
  const trigrams = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.slice(i, i + 3));
  }

  // Sort and join
  return Array.from(trigrams).sort().join("|");
}

/**
 * Compute Jaccard similarity between two fingerprint strings.
 * Returns a value between 0.0 (completely different) and 1.0 (identical).
 */
export function jaccardSimilarity(fp1: string, fp2: string): number {
  // Handle edge cases
  if (!fp1 || !fp2) {
    return 0.0;
  }

  if (fp1 === fp2) {
    return 1.0;
  }

  const set1 = new Set(fp1.split("|"));
  const set2 = new Set(fp2.split("|"));

  // Compute intersection
  let intersectionSize = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionSize++;
    }
  }

  // Compute union
  const unionSize = set1.size + set2.size - intersectionSize;

  if (unionSize === 0) {
    return 0.0;
  }

  return intersectionSize / unionSize;
}
