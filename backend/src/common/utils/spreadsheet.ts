import * as XLSX from 'xlsx';

// Helpers for reading uploaded CSV / Excel files the way people actually fill them in.

/** Rows of the first sheet as objects keyed by header. Dates come back as Date objects. */
export function readSheetRows(buffer: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const first = wb.SheetNames[0];
  if (!first) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], { defval: '', raw: true });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Value of the first matching column, ignoring case, spaces and punctuation
 * ("Expiry date", "expiry_date", "EXPIRY DATE" are the same column).
 */
export function cell(row: Record<string, unknown>, ...names: string[]): unknown {
  const wanted = names.map(norm);
  for (const key of Object.keys(row)) {
    if (wanted.includes(norm(key))) {
      const v = row[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
  }
  return '';
}

export const text = (v: unknown): string => (v instanceof Date ? isoFromDate(v) : String(v ?? '').trim());

/** "1,250", " 1 250 ", 1250 -> 1250. NaN when not a number; null when empty. */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const cleaned = s.replace(/[\s,]/g, '');
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
}

const isoFromDate = (d: Date) =>
  // Excel dates are calendar dates; SheetJS gives them as UTC-ish midnights. Round to the nearest day.
  new Date(d.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 10);

const pad = (n: number) => String(n).padStart(2, '0');
const valid = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/**
 * A date from a spreadsheet cell as YYYY-MM-DD, or null if it isn't one.
 * Accepts real Excel dates, Excel serial numbers, 2028-06-30, 30/06/2028 and 30-06-2028
 * (day first, as written in Rwanda), and 2028/06/30.
 */
export function isoDate(v: unknown): string | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : isoFromDate(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // Excel serial: days since 1899-12-30.
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  }
  const s = String(v ?? '').trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

/** Yes/No-style cell to boolean; null when empty or unclear. */
export function yesNo(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'rx', 'oui'].includes(s)) return true;
  if (['no', 'n', 'false', '0', 'otc', 'non'].includes(s)) return false;
  return null;
}

/** "Fever; Headache, back pain" -> ["Fever", "Headache", "back pain"] (trimmed, no duplicates). */
export function list(v: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(v ?? '').split(/[;,|\n]/)) {
    const item = part.trim().replace(/\s+/g, ' ');
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      out.push(item);
    }
  }
  return out;
}
