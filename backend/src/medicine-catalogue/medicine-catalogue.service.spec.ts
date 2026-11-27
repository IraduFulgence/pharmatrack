import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { MedicineCatalogueService } from './medicine-catalogue.service.js';

const csv = (text: string) => Buffer.from(text, 'utf-8');
const CATEGORIES = { rows: [{ category_id: 1, category_name: 'Painkillers' }, { category_id: 2, category_name: 'Antibiotics' }] };
const EXISTING = { rows: [{ medicine_id: 7, medicine_name: 'Paracetamol 500mg Tablets', strength: '500mg', dosage_form: 'Tablet', brand_name: 'Panadol' }] };

describe('MedicineCatalogueService', () => {
  let service: MedicineCatalogueService;
  let db: any;
  let client: any;

  beforeEach(() => {
    client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    db = { query: vi.fn(), transaction: vi.fn((cb: any) => cb(client)) };
    service = new MedicineCatalogueService(db);
  });

  describe('import preview', () => {
    it('matches categories loosely, splits what it treats, and spots existing medicines', async () => {
      db.query.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce(EXISTING);
      const res = await service.previewImport(csv(
        'Medicine name,Brand name,Strength,Dosage form,Category,Treats,Min age,Max age,Requires prescription\n' +
        'Paracetamol 500mg Tablets,Panadol,500mg,Tablet,painkiller,Fever; Headache,12,,No\n' +
        'Amoxicillin Syrup,,250mg/5ml,Suspension,Antibiotics,Chest infection,,12,Yes\n',
      ));
      const [para, amox] = res.data.rows;
      expect(para).toMatchObject({
        action: 'UPDATE', existingMedicineId: 7, categoryId: 1, categoryName: 'Painkillers',
        indications: ['Fever', 'Headache'], minAgeYears: 12, maxAgeYears: null, requiresPrescription: false, isValid: true,
      });
      expect(amox).toMatchObject({ action: 'CREATE', categoryId: 2, maxAgeYears: 12, requiresPrescription: true, isValid: true });
      expect(res.data).toMatchObject({ toCreate: 1, toUpdate: 1, invalidRows: 0 });
    });

    it('explains invalid rows', async () => {
      db.query.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce({ rows: [] });
      const res = await service.previewImport(csv(
        'Medicine name,Category,Min age,Max age,Requires prescription\n' +
        ',Painkillers,,,\n' +
        'Mystery pill,Space medicine,18,12,maybe\n' +
        'Mystery pill,,1.5,,\n',
      ));
      const [noName, bad, dup] = res.data.rows;
      expect(noName.errors).toContain('Medicine name is required.');
      expect(bad.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/Unknown category "Space medicine"/),
        'Min age cannot be above Max age.',
        'Requires prescription must be Yes or No.',
      ]));
      expect(dup.errors).toEqual(expect.arrayContaining(['Same medicine as row 3.', expect.stringMatching(/Min age must be a whole number/)]));
      expect(res.data.validRows).toBe(0);
    });
  });

  describe('import', () => {
    it('adds new medicines and only fills in the cells given for existing ones', async () => {
      db.query.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce(EXISTING);
      const res = await service.importCatalogue(csv(
        'Medicine name,Brand name,Strength,Dosage form,Category,Treats\n' +
        'Paracetamol 500mg Tablets,Panadol,500mg,Tablet,,Fever\n' +
        'ORS sachet,,,Powder,,Dehydration\n',
      ));
      expect(res.data).toMatchObject({ created: 1, updated: 1, skipped: 0 });
      const update = client.query.mock.calls[0];
      expect(update[0]).toMatch(/^UPDATE public.medicines SET indications = \$1, updated_at/);
      expect(update[1]).toEqual([['Fever'], 7]);
      expect(client.query.mock.calls[1][0]).toMatch(/INSERT INTO public.medicines/);
    });

    it('refuses a file with no valid rows', async () => {
      db.query.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce({ rows: [] });
      await expect(service.importCatalogue(csv('Medicine name\n\n,\n'))).rejects.toThrow(BadRequestException);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('create and update', () => {
    it('rejects a minimum age above the maximum', async () => {
      await expect(service.createMedicine({ medicineName: 'X', minAgeYears: 18, maxAgeYears: 12 })).rejects.toThrow(/Minimum age/);
    });

    it('reports a duplicate catalogue medicine clearly', async () => {
      db.query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));
      await expect(service.createMedicine({ medicineName: 'Paracetamol 500mg Tablets' })).rejects.toThrow(ConflictException);
    });

    it('checks age limits against the saved value when only one side changes', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ medicine_id: 7, medicine_name: 'X', min_age_years: 12, max_age_years: null }] });
      await expect(service.updateMedicine(7, { maxAgeYears: 5 })).rejects.toThrow(/Minimum age/);
    });
  });
});
