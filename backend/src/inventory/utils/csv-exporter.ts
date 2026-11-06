/**
 * Utility to convert array of flat objects into RFC 4180 compliant CSV string
 */
export function jsonToCsv(data: Record<string, any>[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) {
      return '';
    }
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const rows = data.map((row) => headers.map((header) => escapeCell(row[header])).join(','));

  return [headerRow, ...rows].join('\r\n');
}

