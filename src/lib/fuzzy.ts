/**
 * Fuzzy search utilities used by the BLS local search and the global ranker.
 */

// ─── Normalisation ────────────────────────────────────────────────────────────

/** Lowercase + collapse umlauts so users can type without ä/ö/ü/ß */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    // Also accept ae/oe/ue typed by the user — normalise those too so both
    // "haferkäse" and "haferkase" map to the same form.
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
}

/** Split into words, ignoring commas, hyphens, parentheses */
export function tokenize(s: string): string[] {
  return s
    .split(/[\s,\-()/]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0)
}

// ─── Edit distance (Levenshtein, capped for speed) ────────────────────────────

/** Returns edit distance between a and b, capped at `cap` (returns cap+1 if exceeded). */
export function editDistance(a: string, b: string, cap = 2): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  const m = a.length, n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
    // Early exit if whole row is > cap
    if (Math.min(...dp) > cap) return cap + 1
  }
  return dp[n]
}

// ─── Token scoring ────────────────────────────────────────────────────────────

/**
 * Score how well a single query token matches a list of name tokens.
 *
 * 100  exact match
 *  85  query token is a prefix of a name token  ("apfe" → "apfel")
 *  75  name token is a prefix of query token    (handles compound words)
 *  60  query token appears as substring of name token
 *  40  edit distance 1 (one typo), token ≥ 4 chars
 *  20  edit distance 2 (two typos), token ≥ 5 chars
 *   0  no match
 */
function scoreToken(qToken: string, nameTokens: string[]): number {
  let best = 0
  for (const nt of nameTokens) {
    if (nt === qToken)                        { best = Math.max(best, 100); break }
    if (nt.startsWith(qToken))                best = Math.max(best, 85)
    else if (qToken.startsWith(nt))           best = Math.max(best, 75)
    else if (nt.includes(qToken))             best = Math.max(best, 60)
    else if (qToken.length >= 4) {
      const d = editDistance(qToken, nt, 2)
      if (d === 1)                            best = Math.max(best, 40)
      else if (d === 2 && qToken.length >= 5) best = Math.max(best, 20)
    }
  }
  return best
}

// ─── Full item scoring ────────────────────────────────────────────────────────

export interface ScoredItem {
  score: number
}

/**
 * Score a food name against a raw query string.
 * Returns 0 if any query token has no match at all (AND logic).
 * Returns average token score otherwise — higher is better.
 */
export function scoreAgainstQuery(rawQuery: string, rawName: string): number {
  const qTokens  = tokenize(normalize(rawQuery))
  const nTokens  = tokenize(normalize(rawName))

  if (qTokens.length === 0) return 0

  let total = 0
  for (const qt of qTokens) {
    const s = scoreToken(qt, nTokens)
    if (s === 0) return 0   // all tokens must match (AND)
    total += s
  }

  // Bonus: reward shorter names (more generic = more likely what user wants)
  const lengthBonus = Math.max(0, 10 - Math.floor(rawName.length / 10))
  return total / qTokens.length + lengthBonus
}
