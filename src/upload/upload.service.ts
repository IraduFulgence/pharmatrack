import 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly db: DatabaseService) {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * Save a pharmacy document (certificate) to disk
   */
  async savePharmacyDocument(
    file: Express.Multer.File,
    pharmacyId: number,
    docType: string,
  ): Promise<string> {
    const dir = path.join(this.uploadDir, 'pharmacy-docs', String(pharmacyId));

    // Ensure directory exists
    fs.mkdirSync(dir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.originalname) || this.getExtFromMime(file.mimetype);
    const uniqueName = `${docType}-${crypto.randomUUID()}${ext}`;
    const filePath = path.join(dir, uniqueName);

    // Write file buffer to disk
    fs.writeFileSync(filePath, file.buffer);

    this.logger.log(`Saved pharmacy document: ${filePath}`);
    return filePath;
  }

  /**
   * Update pharmacy record with document file paths
   */
  async updatePharmacyDocumentPaths(
    pharmacyId: number,
    pharmacyCertificatePath: string | null,
    rdbCertificatePath: string | null,
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (pharmacyCertificatePath) {
      setClauses.push(`pharmacy_certificate_path = $${paramIndex++}`);
      params.push(pharmacyCertificatePath);
    }
    if (rdbCertificatePath) {
      setClauses.push(`rdb_certificate_path = $${paramIndex++}`);
      params.push(rdbCertificatePath);
    }

    if (setClauses.length > 0) {
      params.push(pharmacyId);
      await this.db.query(
        `UPDATE public.pharmacies SET ${setClauses.join(', ')} WHERE pharmacy_id = $${paramIndex}`,
        params,
      );
    }
  }

  /**
   * Get a file extension from MIME type
   */
  private getExtFromMime(mimetype: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
    };
    return map[mimetype] || '';
  }

  /**
   * Resolve absolute path for a pharmacy document
   */
  getAbsolutePath(relativePath: string): string {
    return path.resolve(relativePath);
  }
}

