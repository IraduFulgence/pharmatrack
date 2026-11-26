import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { isoDate, list, num, yesNo } from './spreadsheet.js';
import { parseAndValidateFile } from '../../inventory/utils/inventory-importer.js';
import { ageLimitProblems, describeAgeLimit } from './age-limits.js';

const xlsx = (rows: Record<string, unknown>[], opts: XLSX.JSON2SheetOpts = {}) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, opts), 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};
const csv = (text: string) => Buffer.from(text, 'utf-8');

describe('spreadsheet cells', () => {
  it('reads dates however they are written', () => {
    expect(isoDate('2028-06-30')).toBe('2028-06-30');
    expect(isoDate('30/06/2028')).toBe('2028-06-30'); // day first
    expect(isoDate('30-06-2028')).toBe('2028-06-30');
    expect(isoDate(47299)).toBe('2029-06-30'); // Excel serial
    expect(isoDate(new Date('2028-06-30T00:00:00Z'))).toBe('2028-06-30');
    expect(isoDate('31/02/2028')).toBeNull();
    expect(isoDate('next year')).toBeNull();
  });

  it('reads numbers with thousands separators', () => {
    expect(num('1,250')).toBe(1250);
    expect(num(' 1 250 ')).toBe(1250);
    expect(num('')).toBeNull();
    expect(Number.isNaN(num('ten'))).toBe(true);
  });

  it('reads yes/no and lists', () => {
    expect(yesNo('Yes')).toBe(true);
    expect(yesNo('no')).toBe(false);
    expect(yesNo('maybe')).toBeNull();
    expect(list('Fever; Headache, fever | back pain')).toEqual(['Fever', 'Headache', 'back pain']);
  });
});

describe('stock import file', () => {
  const future = `${new Date().getFullYear() + 2}-06-30`;

  it('accepts real Excel dates (they used to arrive as serial numbers)', () => {
    const buf = xlsx([{ 'Medicine name': 'Paracetamol', 'Batch number': 'B1', Quantity: 100, 'Selling price': 15, 'Expiry date': new Date(`${future}T00:00:00Z`) }]);
    const res = parseAndValidateFile(buf);
    expect(res.preview[0].errors).toEqual([]);
    expect(res.preview[0].expiryDate).toBe(future);
  });

  it('accepts the old web template ("Unit Price" as the selling price) and DD/MM/YYYY', () => {
    const [y] = future.split('-');
    const res = parseAndValidateFile(csv(`Medicine Name,Batch Number,Quantity,Unit Price,Expiry Date,Reorder Level\nParacetamol 500mg,BATCH-1,"1,000",15.5,30/06/${y},10\n`));
    expect(res.validRows).toBe(1);
    expect(res.preview[0]).toMatchObject({ quantity: 1000, sellingPrice: 15.5, expiryDate: future });
  });

  it('explains bad rows', () => {
    const res = parseAndValidateFile(csv('Medicine name,Batch number,Quantity,Selling price,Expiry date\nIbuprofen,B2,0,abc,2001-01-01\n,B2,5,10,soon\n'));
    expect(res.validRows).toBe(0);
    expect(res.preview[0].errors).toEqual(expect.arrayContaining([
      'Quantity must be a whole number greater than 0.',
      'Selling price must be a number greater than 0.',
      expect.stringMatching(/2001-01-01 has passed/),
    ]));
    expect(res.preview[1].errors).toEqual(expect.arrayContaining([
      'Medicine name is required.',
      expect.stringMatching(/Duplicate batch number/),
      expect.stringMatching(/"soon" is not a date/),
    ]));
  });
});

describe('age limits', () => {
  it('describes limits', () => {
    expect(describeAgeLimit(12, null)).toBe('From 12 years');
    expect(describeAgeLimit(null, 5)).toBe('Up to 5 years');
    expect(describeAgeLimit(6, 12)).toBe('6 to 12 years');
    expect(describeAgeLimit(null, null)).toBeNull();
  });

  it('flags medicines the patient is too young or too old for', () => {
    const items = [
      { name: 'Aspirin', minAge: 16, maxAge: null },
      { name: 'Infant drops', minAge: null, maxAge: 2 },
      { name: 'ORS', minAge: null, maxAge: null },
    ];
    expect(ageLimitProblems(8, 'Keza', items)).toEqual([
      'Aspirin is not for patients under 16; Keza is 8.',
      'Infant drops is only for patients up to 2; Keza is 8.',
    ]);
    expect(ageLimitProblems(null, 'Keza', items)).toEqual([]); // unknown age: nothing to check
  });
});
