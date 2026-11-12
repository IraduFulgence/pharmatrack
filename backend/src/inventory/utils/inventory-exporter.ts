import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  TextRun,
  AlignmentType,
  BorderStyle,
} from 'docx';

export interface InventoryExportItem {
  medicineName: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  batchNumber: string;
  quantityAvailable: number;
  purchasePrice?: number;
  sellingPrice: number;
  reorderLevel: number;
  expiryDate: string;
  status: string;
}

export interface ExportMetadata {
  pharmacyName: string;
  tin?: string;
  email?: string;
  phoneNumber?: string;
  generatedAt: string;
  filterSummary?: string;
}

export class InventoryExporter {
  /**
   * Export to CSV
   */
  static toCsv(items: InventoryExportItem[]): Buffer {
    const flatData = items.map((i) => ({
      'Medicine Name': i.medicineName,
      'Generic Name': i.genericName || '',
      'Brand Name': i.brandName || '',
      'Strength': i.strength || '',
      'Dosage Form': i.dosageForm || '',
      'Batch Number': i.batchNumber,
      'Available Stock': i.quantityAvailable,
      'Purchase Price (RWF)': i.purchasePrice ?? 0,
      'Selling Price (RWF)': i.sellingPrice ?? 0,
      'Reorder Level': i.reorderLevel,
      'Expiry Date': i.expiryDate,
      'Status': i.status,
    }));

    const ws = XLSX.utils.json_to_sheet(flatData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Export to Excel (.xlsx)
   */
  static toExcel(items: InventoryExportItem[], meta?: ExportMetadata): Buffer {
    const flatData = items.map((i) => ({
      'Medicine Name': i.medicineName,
      'Generic Name': i.genericName || '',
      'Brand Name': i.brandName || '',
      'Strength': i.strength || '',
      'Dosage Form': i.dosageForm || '',
      'Batch Number': i.batchNumber,
      'Available Stock': i.quantityAvailable,
      'Purchase Price (RWF)': i.purchasePrice ?? 0,
      'Selling Price (RWF)': i.sellingPrice ?? 0,
      'Reorder Level': i.reorderLevel,
      'Expiry Date': i.expiryDate,
      'Status': i.status,
    }));

    const ws = XLSX.utils.json_to_sheet(flatData);
    ws['!cols'] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 15 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Export to formatted PDF
   */
  static async toPdf(items: InventoryExportItem[], meta: ExportMetadata): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(0, 0, doc.page.width, 70).fill('#064e3b');
      doc
        .fillColor('#ffffff')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('PHARMATRACK INVENTORY REPORT', 40, 20);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Pharmacy: ${meta.pharmacyName} | TIN: ${meta.tin || 'N/A'}`, 40, 45);

      doc.moveDown(3);
      doc.fillColor('#1f2937');

      // Metadata summary
      doc.fontSize(9).font('Helvetica');
      doc.text(`Generated On: ${meta.generatedAt}`, 40, 85);
      if (meta.filterSummary) {
        doc.text(`Filters: ${meta.filterSummary}`, 40, 98);
      }
      doc.text(`Total Batches Listed: ${items.length}`, 40, 111);

      // Table Header
      let yPos = 135;
      const drawTableHeader = () => {
        doc.rect(40, yPos, 515, 20).fill('#f3f4f6');
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8);
        doc.text('MEDICINE NAME', 45, yPos + 6, { width: 150 });
        doc.text('BATCH NO.', 200, yPos + 6, { width: 80 });
        doc.text('QTY', 285, yPos + 6, { width: 45, align: 'right' });
        doc.text('BUY (RWF)', 335, yPos + 6, { width: 55, align: 'right' });
        doc.text('SELL (RWF)', 395, yPos + 6, { width: 55, align: 'right' });
        doc.text('EXPIRY', 455, yPos + 6, { width: 60 });
        doc.text('STATUS', 515, yPos + 6, { width: 40 });
        yPos += 22;
      };

      drawTableHeader();

      // Table Rows
      doc.font('Helvetica').fontSize(8).fillColor('#374151');
      items.forEach((item, index) => {
        if (yPos > 750) {
          doc.addPage();
          yPos = 40;
          drawTableHeader();
        }

        const bg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(40, yPos, 515, 18).fill(bg);
        doc.fillColor('#374151');

        doc.text(item.medicineName.slice(0, 28), 45, yPos + 5, { width: 150 });
        doc.text(item.batchNumber, 200, yPos + 5, { width: 80 });
        doc.text(String(item.quantityAvailable), 285, yPos + 5, { width: 45, align: 'right' });
        doc.text(String(item.purchasePrice ?? 0), 335, yPos + 5, { width: 55, align: 'right' });
        doc.text(String(item.sellingPrice ?? 0), 395, yPos + 5, { width: 55, align: 'right' });
        doc.text(item.expiryDate || '', 455, yPos + 5, { width: 60 });
        doc.text(item.status, 515, yPos + 5, { width: 40 });

        yPos += 18;
      });

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .text('© PharmTrack System — Official Pharmacy Inventory Record', 40, doc.page.height - 30, {
          align: 'center',
        });

      doc.end();
    });
  }

  /**
   * Export to Microsoft Word (.docx)
   */
  static async toWord(items: InventoryExportItem[], meta: ExportMetadata): Promise<Buffer> {
    const tableHeader = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Medicine Name', style: 'HeaderCell' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Batch Number', style: 'HeaderCell' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Quantity', style: 'HeaderCell' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Purchase (RWF)', style: 'HeaderCell' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Selling (RWF)', style: 'HeaderCell' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Expiry Date', style: 'HeaderCell' })] }),
        new TableCell({ children: [new Paragraph({ text: 'Status', style: 'HeaderCell' })] }),
      ],
    });

    const dataRows = items.map((item) => {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.medicineName)] }),
          new TableCell({ children: [new Paragraph(item.batchNumber)] }),
          new TableCell({ children: [new Paragraph(String(item.quantityAvailable))] }),
          new TableCell({ children: [new Paragraph(String(item.purchasePrice ?? 0))] }),
          new TableCell({ children: [new Paragraph(String(item.sellingPrice ?? 0))] }),
          new TableCell({ children: [new Paragraph(item.expiryDate)] }),
          new TableCell({ children: [new Paragraph(item.status)] }),
        ],
      });
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'PHARMATRACK INVENTORY REPORT',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Pharmacy: ${meta.pharmacyName} | TIN: ${meta.tin || 'N/A'}\n`, bold: true }),
                new TextRun(`Report Generated: ${meta.generatedAt}\n`),
                new TextRun(`Total Batches Listed: ${items.length}\n`),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [tableHeader, ...dataRows],
            }),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}

