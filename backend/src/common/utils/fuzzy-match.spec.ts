import { describe, it, expect } from 'vitest';
import { editDistance, fuzzyScore, normalizeSearchText, rankByFuzzy } from './fuzzy-match.js';

const CATALOGUE = [
  ['Amlodipine 5mg Tablets', 'Amlodipine Besylate', 'Norvasc'],
  ['Amoxicillin 500mg Capsules', 'Amoxicillin', 'Amoxil'],
  ['Artemether / Lumefantrine Tablets', 'Artemether + Lumefantrine', 'Coartem'],
  ['Atorvastatin 20mg Tablets', 'Atorvastatin Calcium', 'Lipitor'],
  ['Azithromycin 500mg Tablets', 'Azithromycin', 'Zithromax'],
  ['Cetirizine 10mg Tablets', 'Cetirizine HCl', 'Zyrtec'],
  ['Ciprofloxacin 500mg Tablets', 'Ciprofloxacin', 'Cipro'],
  ['Ibuprofen 400mg Tablets', 'Ibuprofen', 'Brufen'],
  ['Metformin 500mg Tablets', 'Metformin HCl', 'Glucophage'],
  ['Omeprazole 20mg Capsules', 'Omeprazole', 'Losec'],
  ['Paracetamol 500mg Tablets', 'Paracetamol', 'Panadol'],
  ['Salbutamol 100mcg Inhaler', 'Salbutamol / Albuterol', 'Ventolin'],
];

const search = (q: string) => rankByFuzzy(CATALOGUE, q, (names) => names).map((n) => n[0]);

describe('fuzzy medicine search', () => {
  it('finds a medicine when letters are missing', () => {
    expect(search('paractmol')[0]).toBe('Paracetamol 500mg Tablets');
    expect(search('amoxcln')[0]).toBe('Amoxicillin 500mg Capsules');
  });

  it('finds a medicine with wrong, extra or swapped letters', () => {
    expect(search('paracetamoll')[0]).toBe('Paracetamol 500mg Tablets');
    expect(search('ibuprofin')[0]).toBe('Ibuprofen 400mg Tablets');
    expect(search('amoxicilin')[0]).toBe('Amoxicillin 500mg Capsules');
    expect(search('metfromin')[0]).toBe('Metformin 500mg Tablets');
    expect(search('azitromycin')[0]).toBe('Azithromycin 500mg Tablets');
  });

  it('matches brand names and partial words', () => {
    expect(search('panadol')[0]).toBe('Paracetamol 500mg Tablets');
    expect(search('para')[0]).toBe('Paracetamol 500mg Tablets');
    expect(search('Ventolin')[0]).toBe('Salbutamol 100mcg Inhaler');
  });

  it('needs every word to match', () => {
    expect(search('paracetamol 500')).toEqual(['Paracetamol 500mg Tablets']);
    expect(search('amoxicillin 500mg')).toEqual(['Amoxicillin 500mg Capsules']);
  });

  it('puts exact matches before typo matches', () => {
    const results = rankByFuzzy(
      [['Paracetamol'], ['Pracetamol']],
      'pracetamol',
      (n) => n,
    ).map((n) => n[0]);
    expect(results).toEqual(['Pracetamol', 'Paracetamol']);
  });

  it('does not return unrelated medicines', () => {
    expect(search('paractmol')).toEqual(['Paracetamol 500mg Tablets']);
    expect(search('xyzzy')).toEqual([]);
    expect(search('zzzz')).toEqual([]);
  });

  it('ignores case and accents', () => {
    expect(normalizeSearchText('Paracétamol  500MG')).toBe('paracetamol 500mg');
    expect(fuzzyScore('PARACÉTAMOL', ['Paracetamol'])).toBe(0);
  });

  it('counts a swapped pair of letters as one typo', () => {
    expect(editDistance('metfromin', 'metformin')).toBe(1);
    expect(editDistance('abc', 'xyz', 1)).toBe(2); // stops early past the limit
  });
});
