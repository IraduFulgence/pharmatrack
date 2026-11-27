// Typo-tolerant matching for medicine search ("paractmol" finds "Paracetamol").
// Lower score = better match; null = no match.

/** Lowercase, drop accents and anything that is not a letter or digit. */
export const normalizeSearchText = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Optimal string alignment distance (Levenshtein plus swapped neighbours), stopping early past `max`. */
export const editDistance = (a: string, b: string, max = Infinity): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length];
};

/** Typos allowed for a query of this length. */
const allowedTypos = (len: number) => (len < 4 ? 0 : len < 6 ? 1 : len < 9 ? 2 : 3);

/**
 * Length of the shortest stretch of `text` that holds every character of `query` in order,
 * or null if it does not. "paractmol" in "paracetamol" -> 11.
 */
const subsequenceSpan = (query: string, text: string): number | null => {
  let best: number | null = null;
  for (let start = text.indexOf(query[0]); start !== -1; start = text.indexOf(query[0], start + 1)) {
    let qi = 1;
    let ti = start + 1;
    while (qi < query.length && ti < text.length) {
      if (text[ti] === query[qi]) qi++;
      ti++;
    }
    if (qi < query.length) break; // later starts can't do better
    const span = ti - start;
    if (best === null || span < best) best = span;
  }
  return best;
};

/** Score one query word against one normalized name. */
const scoreWord = (q: string, name: string): number | null => {
  if (!q || !name) return null;
  const words = name.split(' ');

  // 1. Plain substring: best, and better still at the start of a word.
  if (words.some((w) => w.startsWith(q))) return 0;
  if (name.includes(q)) return 1;

  const typos = allowedTypos(q.length);

  // 2. A few typos against a whole word, or against the start of one (still typing).
  if (typos > 0) {
    let bestTypos = Infinity;
    for (const w of words) {
      bestTypos = Math.min(
        bestTypos,
        editDistance(q, w, typos),
        editDistance(q, w.slice(0, q.length), typos),
      );
    }
    if (bestTypos <= typos) return 2 + bestTypos;
  }

  // 3. Letters missing: every typed letter appears in order, in a tight stretch.
  //    Same first letter required so short typed fragments don't match everything.
  if (q.length >= 4) {
    const spaceless = name.replace(/ /g, '');
    const span = subsequenceSpan(q, spaceless);
    if (span !== null && span <= Math.ceil(q.length * 1.6) && words.some((w) => w[0] === q[0])) {
      return 6 + (span - q.length) / q.length;
    }
  }
  return null;
};

/**
 * Score a search query against the names of one item (name, generic name, brand...).
 * Every word of the query must match one of the names. Returns null when it doesn't match.
 */
export const fuzzyScore = (query: string, names: Array<string | null | undefined>): number | null => {
  const qWords = normalizeSearchText(query).split(' ').filter(Boolean);
  const normalized = names.map(normalizeSearchText).filter(Boolean);
  if (qWords.length === 0 || normalized.length === 0) return null;

  // The whole query as one word also counts ("para cetamol").
  const joined = qWords.join('');
  let wholeBest: number | null = null;
  for (const n of normalized) {
    const s = scoreWord(joined, n) ?? scoreWord(joined, n.replace(/ /g, ''));
    if (s !== null && (wholeBest === null || s < wholeBest)) wholeBest = s;
  }

  let total = 0;
  for (const q of qWords) {
    let best: number | null = null;
    for (const n of normalized) {
      const s = scoreWord(q, n);
      if (s !== null && (best === null || s < best)) best = s;
    }
    if (best === null) return wholeBest;
    total += best;
  }
  const perWord = total / qWords.length;
  return wholeBest === null ? perWord : Math.min(perWord, wholeBest);
};

/** Keep the items that match, best first (ties keep their original order). */
export const rankByFuzzy = <T>(
  items: T[],
  query: string,
  namesOf: (item: T) => Array<string | null | undefined>,
): T[] =>
  items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, namesOf(item)) }))
    .filter((x): x is { item: T; index: number; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((x) => x.item);
