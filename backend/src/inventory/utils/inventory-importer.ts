import * as XLSX from 'xlsx';
import { cell, isoDate, num, readSheetRows, text } from '../../common/utils/spreadsheet.js';

export interface ImportRowData {
  rowNumber: number;
  medicineName: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  packagingUnit?: string;
  unitsPerPackage?: number;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  preview: ImportRowData[];
}

export const TEMPLATE_COLUMNS = [
  'Medicine name',
  'Generic name',
  'Brand name',
  'Strength',
  'Dosage form',
  'Packaging unit',
  'Units per package',
  'Batch number',
  'Quantity',
  'Purchase price',
  'Selling price',
  'Expiry date',
];

export const SAMPLE_DATA = [
  {
    'Medicine name': 'Amoxicillin 500mg Capsules',
    'Generic name': 'Amoxicillin',
    'Brand name': 'Amoxil',
    'Strength': '500mg',
    'Dosage form': 'Capsule',
    'Packaging unit': 'Box',
    'Units per package': 100,
    'Batch number': 'AMX-2026-01',
    'Quantity': 250,
    'Purchase price': 45.0,
    'Selling price': 65.0,
    'Expiry date': '2028-06-30',
  },
  {
    'Medicine name': 'Paracetamol 500mg Tablets',
    'Generic name': 'Paracetamol',
    'Brand name': 'Panadol',
    'Strength': '500mg',
    'Dosage form': 'Tablet',
    'Packaging unit': 'Carton',
    'Units per package': 500,
    'Batch number': 'PAR-2026-02',
    'Quantity': 1000,
    'Purchase price': 10.0,
    'Selling price': 18.0,
    'Expiry date': '2027-12-31',
  },
  {
    'Medicine name': 'Ibuprofen 400mg Tablets',
    'Generic name': 'Ibuprofen',
    'Brand name': 'Brufen',
    'Strength': '400mg',
    'Dosage form': 'Tablet',
    'Packaging unit': 'Box',
    'Units per package': 50,
    'Batch number': 'IBU-2026-03',
    'Quantity': 300,
    'Purchase price': 25.0,
    'Selling price': 35.0,
    'Expiry date': '2027-09-15',
  },
];

export function generateTemplate(format: 'csv' | 'xlsx'): Buffer {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA, { header: TEMPLATE_COLUMNS });

  // Column widths
  ws['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'InventoryTemplate');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    return Buffer.from(csvContent, 'utf-8');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function parseAndValidateFile(
  buffer: Buffer,
  existingBatches: Set<string> = new Set(),
): ImportPreviewResult {
  let rawRows: Record<string, unknown>[];
  try {
    // cellDates: Excel dates come back as real dates, not serial numbers like 47299.
    rawRows = readSheetRows(buffer);
  } catch {
    return { totalRows: 0, validRows: 0, invalidRows: 0, preview: [] };
  }

  const parsedRows: ImportRowData[] = [];
  const seenBatchesInFile = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 1-based, +1 for header
    const errors: string[] = [];

    // Column names are matched ignoring case, spaces and punctuation; common alternatives accepted.
    const get = (...names: string[]) => text(cell(row, ...names));

    const medicineName = get('Medicine name', 'Medicine', 'Name');
    const genericName = get('Generic name', 'Generic') || medicineName;
    const brandName = get('Brand name', 'Brand') || null;
    const strength = get('Strength') || null;
    const dosageForm = get('Dosage form', 'Form') || 'Tablet';
    const packagingUnit = get('Packaging unit', 'Package unit', 'Packaging') || null;
    const unitsPerPackageRaw = cell(row, 'Units per package', 'Units per pack', 'Pack size');
    const batchNumber = get('Batch number', 'Batch', 'Batch no', 'Lot number');
    const quantity = num(cell(row, 'Quantity', 'Qty', 'Units'));
    const purchasePrice = num(cell(row, 'Purchase price', 'Cost price', 'Buying price', 'Cost'));
    // "Unit price" was the column name in the old web template: it is the selling price.
    const sellingPrice = num(cell(row, 'Selling price', 'Unit price', 'Price', 'Sale price'));
    const expiryCell = cell(row, 'Expiry date', 'Expiry', 'Expires', 'Exp date');
    const expiryDate = isoDate(expiryCell);

    if (!medicineName) {
      errors.push('Medicine name is required.');
    }
    if (!batchNumber) {
      errors.push('Batch number is required.');
    } else {
      if (seenBatchesInFile.has(batchNumber.toUpperCase())) {
        errors.push(`Duplicate batch number "${batchNumber}" within upload file.`);
      } else {
        seenBatchesInFile.add(batchNumber.toUpperCase());
      }

      if (existingBatches.has(batchNumber.toUpperCase())) {
        errors.push(`Batch number "${batchNumber}" already exists in this pharmacy inventory.`);
      }
    }

    if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
      errors.push('Quantity must be a whole number greater than 0.');
    }

    if (purchasePrice !== null && (Number.isNaN(purchasePrice) || purchasePrice < 0)) {
      errors.push('Purchase price must be a number, 0 or more.');
    }

    if (sellingPrice === null || Number.isNaN(sellingPrice) || sellingPrice <= 0) {
      errors.push('Selling price must be a number greater than 0.');
    }

    let unitsPerPackage = 1;
    const units = num(unitsPerPackageRaw);
    if (units !== null) {
      if (!Number.isInteger(units) || units <= 0) {
        errors.push('Units per package must be a whole number greater than 0.');
      } else {
        unitsPerPackage = units;
      }
    }

    if (text(expiryCell) === '') {
      errors.push('Expiry date is required.');
    } else if (!expiryDate) {
      errors.push(`Expiry date "${text(expiryCell)}" is not a date. Use YYYY-MM-DD or DD/MM/YYYY.`);
    } else if (expiryDate <= today) {
      errors.push(`Expiry date ${expiryDate} has passed. Only stock that is still in date can be added.`);
    }

    parsedRows.push({
      rowNumber,
      medicineName,
      genericName: genericName || undefined,
      brandName: brandName || undefined,
      strength: strength || undefined,
      dosageForm,
      packagingUnit: packagingUnit || undefined,
      unitsPerPackage,
      batchNumber,
      quantity: quantity !== null && !Number.isNaN(quantity) ? quantity : 0,
      purchasePrice: purchasePrice !== null && !Number.isNaN(purchasePrice) ? purchasePrice : 0,
      sellingPrice: sellingPrice !== null && !Number.isNaN(sellingPrice) ? sellingPrice : 0,
      expiryDate: expiryDate || text(expiryCell),
      isValid: errors.length === 0,
      errors,
    });
  });

  const validRows = parsedRows.filter((r) => r.isValid).length;
  const invalidRows = parsedRows.length - validRows;

  return {
    totalRows: parsedRows.length,
    validRows,
    invalidRows,
    preview: parsedRows,
  };
}
