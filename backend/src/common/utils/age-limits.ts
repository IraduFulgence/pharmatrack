// Age limits on medicines ("not for children under 12").

export interface AgeLimited {
  name: string;
  minAge: number | null;
  maxAge: number | null;
}

/** "From 12 years", "Up to 5 years", "6 to 12 years", or null when anyone may take it. */
export function describeAgeLimit(minAge: number | null | undefined, maxAge: number | null | undefined): string | null {
  const min = minAge ?? null;
  const max = maxAge ?? null;
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${min} to ${max} years`;
  if (min !== null) return `From ${min} years`;
  return `Up to ${max} years`;
}

/**
 * Problems giving these medicines to someone aged `age` (whole years).
 * `who` names the person in messages ("Keza (8)" or "this patient").
 */
export function ageLimitProblems(age: number | null, who: string, items: AgeLimited[]): string[] {
  if (age === null || !Number.isFinite(age)) return [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.name)) continue;
    seen.add(it.name);
    if (it.minAge !== null && it.minAge !== undefined && age < it.minAge) {
      problems.push(`${it.name} is not for patients under ${it.minAge}; ${who} is ${age}.`);
    } else if (it.maxAge !== null && it.maxAge !== undefined && age > it.maxAge) {
      problems.push(`${it.name} is only for patients up to ${it.maxAge}; ${who} is ${age}.`);
    }
  }
  return problems;
}
