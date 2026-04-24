// ============================================================
// Exercise name normalization
// Maps raw parsed names → canonical exercise names
// ============================================================
import { MOCK_EXERCISES } from "@/lib/mock-data";
import { Exercise } from "@/types";

// Build a map from all aliases + canonical names → canonical_name
const buildAliasMap = (exercises: Exercise[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const ex of exercises) {
    map.set(ex.canonical_name.toLowerCase(), ex.canonical_name);
    map.set(ex.name.toLowerCase(), ex.canonical_name);
    for (const alias of ex.aliases) {
      map.set(alias.toLowerCase(), ex.canonical_name);
    }
  }
  return map;
};

// Fuzzy-ish token match: strip punctuation, lowercase, split on spaces
function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

function tokenOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}

export function normalizeExerciseName(
  raw: string,
  exercises: Exercise[] = MOCK_EXERCISES
): {
  canonical_name: string | null;
  confidence: "exact" | "fuzzy" | "unmatched";
  matched_name?: string;
} {
  const lower = raw.toLowerCase().trim();
  const aliasMap = buildAliasMap(exercises);

  // Exact map lookup
  if (aliasMap.has(lower)) {
    return { canonical_name: aliasMap.get(lower)!, confidence: "exact", matched_name: lower };
  }

  // Fuzzy: find exercise with highest token overlap
  const rawTokens = tokenize(raw);
  let best: { canonical: string; name: string; score: number } | null = null;

  for (const ex of exercises) {
    const candidates = [ex.name, ex.canonical_name, ...ex.aliases];
    for (const c of candidates) {
      const score = tokenOverlap(rawTokens, tokenize(c));
      if (score > 0 && (!best || score > best.score)) {
        best = { canonical: ex.canonical_name, name: c, score };
      }
    }
  }

  if (best && best.score >= Math.min(2, rawTokens.length)) {
    return { canonical_name: best.canonical, confidence: "fuzzy", matched_name: best.name };
  }

  return { canonical_name: null, confidence: "unmatched" };
}
