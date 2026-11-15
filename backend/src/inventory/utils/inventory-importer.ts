import * as XLSX from 'xlsx';

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
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return { totalRows: 0, validRows: 0, invalidRows: 0, preview: [] };
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[firstSheetName], {
    defval: '',
  });

  const parsedRows: ImportRowData[] = [];
  const seenBatchesInFile = new Set<string>();

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 1-based, +1 for header
    const errors: string[] = [];

    // Helper for flexible column keys
    const getVal = (col: string) => {
      const direct = row[col];
      if (direct !== undefined && direct !== '') return String(direct).trim();
      const lowerKey = Object.keys(row).find((k) => k.toLowerCase() === col.toLowerCase());
      return lowerKey && row[lowerKey] !== undefined ? String(row[lowerKey]).trim() : '';
    };

    const medicineName = getVal('Medicine name');
    const genericName = getVal('Generic name') || medicineName;
    const brandName = getVal('Brand name') || null;
    const strength = getVal('Strength') || null;
    const dosageForm = getVal('Dosage form') || 'Tablet';
    const packagingUnit = getVal('Packaging unit') || null;
    const unitsPerPackageRaw = getVal('Units per package');
    const batchNumber = getVal('Batch number');
    const quantityRaw = getVal('Quantity');
    const purchasePriceRaw = getVal('Purchase price');
    const sellingPriceRaw = getVal('Selling price');
    const expiryDate = getVal('Expiry date');

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

    const quantity = Number(quantityRaw);
    if (!quantityRaw || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      errors.push('Quantity must be an integer greater than 0.');
    }

    const purchasePrice = Number(purchasePriceRaw);
    if (purchasePriceRaw !== '' && (isNaN(purchasePrice) || purchasePrice < 0)) {
      errors.push('Purchase price cannot be negative.');
    }

    const sellingPrice = Number(sellingPriceRaw);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      errors.push('Selling price must be greater than 0.');
    }

    let unitsPerPackage = 1;
    if (unitsPerPackageRaw) {
      const parsedUnits = Number(unitsPerPackageRaw);
      if (isNaN(parsedUnits) || parsedUnits <= 0 || !Number.isInteger(parsedUnits)) {
        errors.push('Units per package must be an integer greater than 0.');
      } else {
        unitsPerPackage = parsedUnits;
      }
    }

    // Expiry date validation
    if (!expiryDate) {
      errors.push('Expiry date is required.');
    } else {
      const parsedDate = new Date(expiryDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Expiry date must be in YYYY-MM-DD format.');
      } else if (parsedDate <= new Date()) {
        errors.push('Expiry date must be in the future.');
      }
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
      quantity,
      purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
      sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
      expiryDate,
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

