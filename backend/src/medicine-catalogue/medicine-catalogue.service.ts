import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { DatabaseService } from '../database/database.service.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';
import { rankByFuzzy } from '../common/utils/fuzzy-match.js';
import { cell, list, num, readSheetRows, text, yesNo } from '../common/utils/spreadsheet.js';
import { describeAgeLimit } from '../common/utils/age-limits.js';
import type { CatalogueMedicineDto, CreateCategoryDto, UpdateCatalogueMedicineDto } from './dto/catalogue.dto.js';

// The shared medicine catalogue that system admins curate (medicines.pharmacy_id IS NULL).
// Pharmacies stock these; patients see them in the marketplace.

const MEDICINE_SELECT = `
  SELECT
    m.medicine_id, m.medicine_name, m.generic_name, m.brand_name, m.strength, m.dosage_form,
    m.description, m.requires_prescription, m.pharmacy_id, ph.pharmacy_name,
    m.category_id, c.category_name, m.indications, m.min_age_years, m.max_age_years, m.dosage_notes,
    CASE WHEN m.medicine_image_path IS NOT NULL
      THEN '/medicines/' || m.medicine_id || '/image?v=' || LEFT(MD5(m.medicine_image_path), 8)
    END AS image_url,
    to_char(m.created_at, 'YYYY-MM-DD') AS created_at,
    to_char(m.updated_at, 'YYYY-MM-DD') AS updated_at,
    (SELECT COUNT(DISTINCT ib.pharmacy_id)::INTEGER FROM public.inventory_batches ib
      WHERE ib.medicine_id = m.medicine_id AND ib.quantity > 0) AS pharmacies_stocking
  FROM public.medicines m
  LEFT JOIN public.medicine_categories c ON c.category_id = m.category_id
  LEFT JOIN public.pharmacies ph ON ph.pharmacy_id = m.pharmacy_id
`;

const toMedicine = (r: any) => ({
  ...r,
  medicine_id: Number(r.medicine_id),
  pharmacy_id: r.pharmacy_id === null ? null : Number(r.pharmacy_id),
  category_id: r.category_id === null ? null : Number(r.category_id),
  indications: r.indications || [],
  min_age_years: r.min_age_years === null ? null : Number(r.min_age_years),
  max_age_years: r.max_age_years === null ? null : Number(r.max_age_years),
  age_limit: describeAgeLimit(r.min_age_years, r.max_age_years),
  scope: r.pharmacy_id === null ? 'CATALOGUE' : 'PHARMACY',
});

/** Identity of a catalogue medicine: same name, strength, form and brand = same medicine. */
const keyOf = (m: { name: string; strength?: string | null; form?: string | null; brand?: string | null }) =>
  [m.name, m.strength, m.form, m.brand].map((v) => String(v ?? '').trim().toLowerCase()).join('|');

export const CATALOGUE_TEMPLATE_COLUMNS = [
  'Medicine name', 'Generic name', 'Brand name', 'Strength', 'Dosage form', 'Category',
  'Treats', 'Min age', 'Max age', 'Dosage notes', 'Requires prescription', 'Description',
];

const CATALOGUE_SAMPLE = [
  {
    'Medicine name': 'Paracetamol 500mg Tablets', 'Generic name': 'Paracetamol', 'Brand name': 'Panadol',
    'Strength': '500mg', 'Dosage form': 'Tablet', 'Category': 'Painkillers', 'Treats': 'Fever; Headache; Mild pain',
    'Min age': 12, 'Max age': '', 'Dosage notes': '1-2 tablets every 4-6 hours. Max 8 tablets in 24 hours.',
    'Requires prescription': 'No', 'Description': 'Relieves mild to moderate pain and reduces fever.',
  },
  {
    'Medicine name': 'Amoxicillin 250mg/5ml Suspension', 'Generic name': 'Amoxicillin', 'Brand name': 'Amoxil',
    'Strength': '250mg/5ml', 'Dosage form': 'Suspension', 'Category': 'Antibiotics', 'Treats': 'Chest infections; Ear infections',
    'Min age': '', 'Max age': 12, 'Dosage notes': 'Dose by weight as prescribed. Finish the full course.',
    'Requires prescription': 'Yes', 'Description': 'Antibiotic for bacterial infections in children.',
  },
];

export interface CatalogueImportRow {
  rowNumber: number;
  medicineName: string;
  genericName: string | null;
  brandName: string | null;
  strength: string | null;
  dosageForm: string | null;
  categoryId: number | null;
  categoryName: string | null;
  indications: string[];
  minAgeYears: number | null;
  maxAgeYears: number | null;
  dosageNotes: string | null;
  requiresPrescription: boolean | null;
  description: string | null;
  /** CREATE a new catalogue medicine, or UPDATE the existing one with the same name/strength/form/brand. */
  action: 'CREATE' | 'UPDATE';
  existingMedicineId: number | null;
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class MedicineCatalogueService {
  constructor(private readonly db: DatabaseService) {}

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async listCategories(): Promise<ApiResponse> {
    const res = await this.db.query(
      `SELECT c.category_id, c.category_name, c.description,
              (SELECT COUNT(*)::INTEGER FROM public.medicines m WHERE m.category_id = c.category_id) AS medicine_count
       FROM public.medicine_categories c
       ORDER BY (LOWER(c.category_name) = 'other'), c.category_name`,
    );
    return {
      success: true,
      message: 'Medicine categories retrieved successfully.',
      data: res.rows.map((r: any) => ({ ...r, category_id: Number(r.category_id) })),
    };
  }

  async createCategory(dto: CreateCategoryDto): Promise<ApiResponse> {
    try {
      const res = await this.db.query(
        `INSERT INTO public.medicine_categories (category_name, description) VALUES ($1, $2)
         RETURNING category_id, category_name, description`,
        [dto.categoryName, dto.description || null],
      );
      return { success: true, message: `Category "${dto.categoryName}" added.`, data: { ...res.rows[0], category_id: Number(res.rows[0].category_id) } };
    } catch (err: any) {
      if (err?.code === '23505') throw new ConflictException(`A category called "${dto.categoryName}" already exists.`);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Medicines
  // ---------------------------------------------------------------------------

  /**
   * List medicines. scope: CATALOGUE (shared, default), PHARMACY (added by pharmacies), ALL.
   * Search is typo tolerant and also matches what a medicine treats and its category.
   */
  async listMedicines(query: { q?: string; categoryId?: string; scope?: string; page?: string; limit?: string }): Promise<ApiResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const scope = (query.scope || 'CATALOGUE').toUpperCase();
    const where: string[] = [];
    const params: unknown[] = [];
    if (scope === 'CATALOGUE') where.push('m.pharmacy_id IS NULL');
    else if (scope === 'PHARMACY') where.push('m.pharmacy_id IS NOT NULL');
    if (query.categoryId === 'none') where.push('m.category_id IS NULL');
    else if (query.categoryId) {
      params.push(Number(query.categoryId));
      where.push(`m.category_id = $${params.length}`);
    }

    const res = await this.db.query(
      `${MEDICINE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY m.medicine_name ASC, m.medicine_id ASC`,
      params,
    );
    let rows = res.rows;
    const q = query.q?.trim();
    if (q) {
      rows = rankByFuzzy(rows, q, (m: any) => [
        m.medicine_name, m.generic_name, m.brand_name, m.category_name, ...(m.indications || []),
      ]);
    }
    const total = rows.length;
    return {
      success: true,
      message: 'Medicines retrieved successfully.',
      data: {
        medicines: rows.slice((page - 1) * limit, page * limit).map(toMedicine),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async getMedicine(medicineId: number): Promise<ApiResponse> {
    const res = await this.db.query(`${MEDICINE_SELECT} WHERE m.medicine_id = $1`, [medicineId]);
    if (res.rows.length === 0) throw new NotFoundException('Medicine not found.');
    return { success: true, message: 'Medicine retrieved successfully.', data: toMedicine(res.rows[0]) };
  }

  private checkAges(min: number | null | undefined, max: number | null | undefined) {
    if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
      throw new BadRequestException('Minimum age cannot be above the maximum age.');
    }
  }

  private async checkCategory(categoryId: number | null | undefined) {
    if (categoryId === null || categoryId === undefined) return;
    const res = await this.db.query('SELECT 1 FROM public.medicine_categories WHERE category_id = $1', [categoryId]);
    if (res.rows.length === 0) throw new BadRequestException('Choose a category from the list.');
  }

  private duplicate(err: any, name: string): never {
    if (err?.code === '23505') {
      throw new ConflictException(`"${name}" with this strength, form and brand is already in the catalogue.`);
    }
    throw err;
  }

  async createMedicine(dto: CatalogueMedicineDto): Promise<ApiResponse> {
    this.checkAges(dto.minAgeYears, dto.maxAgeYears);
    await this.checkCategory(dto.categoryId);
    let res;
    try {
      res = await this.db.query(
        `INSERT INTO public.medicines
           (pharmacy_id, medicine_name, generic_name, brand_name, strength, dosage_form, description,
            requires_prescription, category_id, indications, min_age_years, max_age_years, dosage_notes)
         VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING medicine_id`,
        [
          dto.medicineName, dto.genericName || null, dto.brandName || null, dto.strength || null,
          dto.dosageForm || null, dto.description || null, Boolean(dto.requiresPrescription),
          dto.categoryId ?? null, dto.indications || [], dto.minAgeYears ?? null, dto.maxAgeYears ?? null,
          dto.dosageNotes || null,
        ],
      );
    } catch (err) {
      this.duplicate(err, dto.medicineName);
    }
    const created = await this.getMedicine(Number(res.rows[0].medicine_id));
    return { ...created, message: `${dto.medicineName} added to the catalogue.` };
  }

  async updateMedicine(medicineId: number, dto: UpdateCatalogueMedicineDto): Promise<ApiResponse> {
    const current = await this.db.query(
      'SELECT medicine_id, medicine_name, min_age_years, max_age_years FROM public.medicines WHERE medicine_id = $1',
      [medicineId],
    );
    if (current.rows.length === 0) throw new NotFoundException('Medicine not found.');
    const cur = current.rows[0];
    this.checkAges(
      dto.minAgeYears !== undefined ? dto.minAgeYears : cur.min_age_years,
      dto.maxAgeYears !== undefined ? dto.maxAgeYears : cur.max_age_years,
    );
    await this.checkCategory(dto.categoryId);

    const columns: Array<[keyof CatalogueMedicineDto, string, (v: any) => unknown]> = [
      ['medicineName', 'medicine_name', (v) => v],
      ['genericName', 'generic_name', (v) => v || null],
      ['brandName', 'brand_name', (v) => v || null],
      ['strength', 'strength', (v) => v || null],
      ['dosageForm', 'dosage_form', (v) => v || null],
      ['description', 'description', (v) => v || null],
      ['requiresPrescription', 'requires_prescription', (v) => Boolean(v)],
      ['categoryId', 'category_id', (v) => v ?? null],
      ['indications', 'indications', (v) => v || []],
      ['minAgeYears', 'min_age_years', (v) => v ?? null],
      ['maxAgeYears', 'max_age_years', (v) => v ?? null],
      ['dosageNotes', 'dosage_notes', (v) => v || null],
    ];
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [field, column, map] of columns) {
      if ((dto as any)[field] !== undefined) {
        params.push(map((dto as any)[field]));
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw new BadRequestException('Nothing to update.');
    params.push(medicineId);
    try {
      await this.db.query(
        `UPDATE public.medicines SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE medicine_id = $${params.length}`,
        params,
      );
    } catch (err) {
      this.duplicate(err, dto.medicineName || cur.medicine_name);
    }
    const updated = await this.getMedicine(medicineId);
    return { ...updated, message: 'Medicine updated.' };
  }

  // ---------------------------------------------------------------------------
  // Bulk import
  // ---------------------------------------------------------------------------

  catalogueTemplate(format: 'csv' | 'xlsx'): { buffer: Buffer; contentType: string; filename: string } {
    const ws = XLSX.utils.json_to_sheet(CATALOGUE_SAMPLE, { header: CATALOGUE_TEMPLATE_COLUMNS });
    ws['!cols'] = [30, 18, 15, 12, 14, 18, 32, 9, 9, 45, 12, 40].map((wch) => ({ wch }));
    if (format === 'csv') {
      return {
        buffer: Buffer.from(XLSX.utils.sheet_to_csv(ws), 'utf-8'),
        contentType: 'text/csv; charset=utf-8',
        filename: 'pharmatrack_medicine_catalogue_template.csv',
      };
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Medicines');
    return {
      buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'pharmatrack_medicine_catalogue_template.xlsx',
    };
  }

  /** Read and check a catalogue file without saving anything. */
  async parseCatalogueFile(buffer: Buffer): Promise<{ rows: CatalogueImportRow[]; totalRows: number; validRows: number; invalidRows: number }> {
    let raw: Record<string, unknown>[];
    try {
      raw = readSheetRows(buffer);
    } catch {
      throw new BadRequestException('Could not read this file. Upload a CSV or Excel (.xlsx) file.');
    }
    if (raw.length > 2000) throw new BadRequestException('Import at most 2,000 medicines at a time.');

    const [catRes, existingRes] = await Promise.all([
      this.db.query('SELECT category_id, category_name FROM public.medicine_categories'),
      this.db.query(
        'SELECT medicine_id, medicine_name, strength, dosage_form, brand_name FROM public.medicines WHERE pharmacy_id IS NULL',
      ),
    ]);
    const categories = catRes.rows.map((c: any) => ({ id: Number(c.category_id), name: String(c.category_name) }));
    const existing = new Map<string, number>(
      existingRes.rows.map((m: any) => [
        keyOf({ name: m.medicine_name, strength: m.strength, form: m.dosage_form, brand: m.brand_name }),
        Number(m.medicine_id),
      ]),
    );
    const findCategory = (name: string) => {
      const exact = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (exact) return exact;
      return rankByFuzzy(categories, name, (c) => [c.name])[0] || null; // "Painkiller" -> Painkillers
    };

    const seenInFile = new Map<string, number>();
    const rows: CatalogueImportRow[] = raw.map((r, i) => {
      const rowNumber = i + 2;
      const errors: string[] = [];
      const str = (max: number, label: string, ...names: string[]) => {
        const v = text(cell(r, ...names));
        if (v.length > max) errors.push(`${label} can be at most ${max} characters.`);
        return v || null;
      };
      const medicineName = str(200, 'Medicine name', 'Medicine name', 'Name', 'Medicine') || '';
      if (!medicineName) errors.push('Medicine name is required.');
      const genericName = str(200, 'Generic name', 'Generic name', 'Generic');
      const brandName = str(200, 'Brand name', 'Brand name', 'Brand');
      const strength = str(100, 'Strength', 'Strength');
      const dosageForm = str(100, 'Dosage form', 'Dosage form', 'Form');
      const dosageNotes = str(2000, 'Dosage notes', 'Dosage notes', 'Dosage', 'Dosage instructions');
      const description = str(2000, 'Description', 'Description');

      let categoryId: number | null = null;
      let categoryName: string | null = null;
      const catText = text(cell(r, 'Category', 'Medicine category'));
      if (catText) {
        const c = findCategory(catText);
        if (c) { categoryId = c.id; categoryName = c.name; }
        else errors.push(`Unknown category "${catText}". Use one of: ${categories.map((x) => x.name).join(', ')}.`);
      }

      const indications = list(cell(r, 'Treats', 'Indications', 'Uses', 'Cures'));
      if (indications.length > 20) errors.push('List at most 20 conditions it treats.');
      if (indications.some((x) => x.length > 100)) errors.push('Each condition it treats can be at most 100 characters.');

      const age = (label: string, ...names: string[]) => {
        const v = num(cell(r, ...names));
        if (v === null) return null;
        if (!Number.isInteger(v) || v < 0 || v > 130) {
          errors.push(`${label} must be a whole number of years between 0 and 130.`);
          return null;
        }
        return v;
      };
      const minAgeYears = age('Min age', 'Min age', 'Minimum age', 'Min age years');
      const maxAgeYears = age('Max age', 'Max age', 'Maximum age', 'Max age years');
      if (minAgeYears !== null && maxAgeYears !== null && minAgeYears > maxAgeYears) {
        errors.push('Min age cannot be above Max age.');
      }

      const rxCell = cell(r, 'Requires prescription', 'Prescription', 'Rx');
      const requiresPrescription = yesNo(rxCell);
      if (text(rxCell) && requiresPrescription === null) errors.push('Requires prescription must be Yes or No.');

      const key = keyOf({ name: medicineName, strength, form: dosageForm, brand: brandName });
      if (medicineName) {
        const firstRow = seenInFile.get(key);
        if (firstRow) errors.push(`Same medicine as row ${firstRow}.`);
        else seenInFile.set(key, rowNumber);
      }
      const existingMedicineId = existing.get(key) ?? null;

      return {
        rowNumber, medicineName, genericName, brandName, strength, dosageForm, categoryId, categoryName,
        indications, minAgeYears, maxAgeYears, dosageNotes, requiresPrescription, description,
        action: existingMedicineId ? 'UPDATE' : 'CREATE',
        existingMedicineId,
        isValid: errors.length === 0,
        errors,
      };
    });

    const validRows = rows.filter((r) => r.isValid).length;
    return { rows, totalRows: rows.length, validRows, invalidRows: rows.length - validRows };
  }

  async previewImport(buffer: Buffer): Promise<ApiResponse> {
    const parsed = await this.parseCatalogueFile(buffer);
    return {
      success: true,
      message: parsed.totalRows === 0 ? 'The file has no rows.' : 'Catalogue file checked.',
      data: {
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        invalidRows: parsed.invalidRows,
        toCreate: parsed.rows.filter((r) => r.isValid && r.action === 'CREATE').length,
        toUpdate: parsed.rows.filter((r) => r.isValid && r.action === 'UPDATE').length,
        rows: parsed.rows,
      },
    };
  }

  /**
   * Save the valid rows: new medicines are added; a medicine already in the catalogue
   * (same name, strength, form and brand) gets the non-empty cells of its row.
   * Invalid rows are skipped and reported.
   */
  async importCatalogue(buffer: Buffer): Promise<ApiResponse> {
    const parsed = await this.parseCatalogueFile(buffer);
    const errors = parsed.rows.filter((r) => !r.isValid).map((r) => ({ row: r.rowNumber, medicineName: r.medicineName, errors: r.errors }));
    if (parsed.validRows === 0) {
      throw new BadRequestException({
        success: false,
        message: parsed.totalRows === 0 ? 'The file has no rows.' : 'No valid rows to import. Fix the errors and try again.',
        errors,
      });
    }

    const counts = await this.db.transaction(async (client) => {
      let created = 0;
      let updated = 0;
      for (const row of parsed.rows) {
        if (!row.isValid) continue;
        if (row.existingMedicineId) {
          // Only overwrite what the row fills in.
          const sets: string[] = [];
          const params: unknown[] = [];
          const put = (col: string, v: unknown) => { params.push(v); sets.push(`${col} = $${params.length}`); };
          if (row.genericName) put('generic_name', row.genericName);
          if (row.description) put('description', row.description);
          if (row.categoryId) put('category_id', row.categoryId);
          if (row.indications.length) put('indications', row.indications);
          if (row.minAgeYears !== null) put('min_age_years', row.minAgeYears);
          if (row.maxAgeYears !== null) put('max_age_years', row.maxAgeYears);
          if (row.dosageNotes) put('dosage_notes', row.dosageNotes);
          if (row.requiresPrescription !== null) put('requires_prescription', row.requiresPrescription);
          if (sets.length) {
            params.push(row.existingMedicineId);
            await client.query(
              `UPDATE public.medicines SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE medicine_id = $${params.length}`,
              params,
            );
          }
          updated++;
        } else {
          await client.query(
            `INSERT INTO public.medicines
               (pharmacy_id, medicine_name, generic_name, brand_name, strength, dosage_form, description,
                requires_prescription, category_id, indications, min_age_years, max_age_years, dosage_notes)
             VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              row.medicineName, row.genericName, row.brandName, row.strength, row.dosageForm, row.description,
              row.requiresPrescription ?? false, row.categoryId, row.indications, row.minAgeYears, row.maxAgeYears,
              row.dosageNotes,
            ],
          );
          created++;
        }
      }
      return { created, updated };
    });

    return {
      success: true,
      message: `Imported ${counts.created + counts.updated} medicine(s): ${counts.created} added, ${counts.updated} updated${errors.length ? `, ${errors.length} row(s) skipped` : ''}.`,
      data: { totalRows: parsed.totalRows, ...counts, skipped: errors.length, errors },
    };
  }
}
