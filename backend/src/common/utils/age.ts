// Age checks done on calendar dates (YYYY-MM-DD), never on Date objects, so a
// birthday isn't judged on the wrong day because of server time zones.

/** Patients registering themselves must be at least this old. */
export const MIN_SELF_REGISTRATION_AGE = 18;

/** The time zone birthdays are counted in (PharmaTrack operates in Rwanda). */
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'Africa/Kigali';

/** Today's date as YYYY-MM-DD in the app's time zone. */
export const todayIso = (timeZone = APP_TIME_ZONE, now = new Date()): string =>
  // en-CA formats as YYYY-MM-DD.
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const parts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
};

/** True when YYYY-MM-DD is a real calendar date (no 2001-02-30). */
export const isRealDate = (iso: string): boolean => {
  const p = parts(iso);
  if (!p) return false;
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return dt.getUTCFullYear() === p.y && dt.getUTCMonth() === p.m - 1 && dt.getUTCDate() === p.d;
};

/**
 * Completed years between a date of birth and `today` (both YYYY-MM-DD).
 * Someone born on 29 February turns a year older on 1 March in non-leap years.
 */
export const ageOn = (dobIso: string, today: string = todayIso()): number => {
  const b = parts(dobIso);
  const t = parts(today);
  if (!b || !t) return NaN;
  let age = t.y - b.y;
  if (t.m < b.m || (t.m === b.m && t.d < b.d)) age--;
  return age;
};

/** The date someone born on `dobIso` turns `years` old (YYYY-MM-DD). */
export const birthdayAtAge = (dobIso: string, years: number): string => {
  const b = parts(dobIso)!;
  const y = b.y + years;
  // 29 Feb in a non-leap year -> 1 Mar.
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const [m, d] = b.m === 2 && b.d === 29 && !leap ? [3, 1] : [b.m, b.d];
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/**
 * Birth year written in a Rwandan National ID (digits 2-5, e.g. 1 1990 8 ... -> 1990),
 * or null if the number doesn't follow that layout.
 */
export const birthYearFromRwandanNid = (nid: string | null | undefined): number | null => {
  const m = /^[123](\d{4})\d{11}$/.exec((nid || '').trim());
  if (!m) return null;
  const year = Number(m[1]);
  return year >= 1900 && year <= new Date().getFullYear() ? year : null;
};
