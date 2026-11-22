
import 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly maxMedicineImageSize = 5 * 1024 * 1024;

  private readonly medicineImageTypes: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };

  constructor(private readonly db: DatabaseService) {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * Save a pharmacy document (certificate) to disk.
   */
  async savePharmacyDocument(
    file: Express.Multer.File,
    pharmacyId: number,
    docType: string,
  ): Promise<string> {
    const dir = path.join(
      this.uploadDir,
      'pharmacy-docs',
      String(pharmacyId),
    );

    fs.mkdirSync(dir, { recursive: true });

    const ext =
      path.extname(file.originalname) ||
      this.getExtFromMime(file.mimetype);

    const uniqueName = `${docType}-${crypto.randomUUID()}${ext}`;
    const filePath = path.join(dir, uniqueName);

    fs.writeFileSync(filePath, file.buffer);

    this.logger.log(`Saved pharmacy document: ${filePath}`);
    return filePath;
  }

  /**
   * Update pharmacy record with document file paths.
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
        `UPDATE public.pharmacies
         SET ${setClauses.join(', ')}
         WHERE pharmacy_id = $${paramIndex}`,
        params,
      );
    }
  }

  /**
   * Upload or replace a medicine image.
   *
   * The database column medicine_image_path must exist.
   * The previous image is deleted only after the database update succeeds.
   */
  async replaceMedicineImage(
    medicineId: number,
    file: Express.Multer.File,
  ): Promise<{
    medicineId: number;
    imagePath: string;
    previousImageRemoved: boolean;
  }> {
    this.validateMedicineImage(file);

    const existingResult = await this.db.query(
      `SELECT medicine_id, medicine_image_path
       FROM public.medicines
       WHERE medicine_id = $1
       LIMIT 1`,
      [medicineId],
    );

    if (existingResult.rows.length === 0) {
      throw new NotFoundException('Medicine not found.');
    }

    const previousImagePath =
      existingResult.rows[0].medicine_image_path || null;

    const imageDirectory = path.join(
      this.uploadDir,
      'medicine-images',
    );

    await fs.promises.mkdir(imageDirectory, { recursive: true });

    const extension = this.medicineImageTypes[file.mimetype];
    const filename = `${crypto.randomUUID()}${extension}`;
    const absolutePath = path.join(imageDirectory, filename);
    const storedPath = path.join(
      'medicine-images',
      filename,
    );

    await fs.promises.writeFile(absolutePath, file.buffer, {
      flag: 'wx',
    });

    try {
      const updateResult = await this.db.query(
        `UPDATE public.medicines
         SET medicine_image_path = $1
         WHERE medicine_id = $2
         RETURNING medicine_id`,
        [storedPath, medicineId],
      );

      if (updateResult.rows.length === 0) {
        throw new NotFoundException('Medicine not found.');
      }
    } catch (error) {
      await this.deleteFileIfExists(absolutePath);
      throw error;
    }

    let previousImageRemoved = false;

    if (previousImagePath) {
      previousImageRemoved =
        await this.deleteMedicineImage(previousImagePath);
    }

    this.logger.log(
      `Medicine image updated for medicine ${medicineId}`,
    );

    return {
      medicineId,
      imagePath: storedPath.replace(/\\/g, '/'),
      previousImageRemoved,
    };
  }

  /**
   * Validate uploaded medicine images.
   */
  private validateMedicineImage(
    file: Express.Multer.File,
  ): void {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Please upload an image.');
    }

    if (file.size > this.maxMedicineImageSize) {
      throw new BadRequestException(
        'Medicine images must not exceed 5 MB.',
      );
    }

    if (!this.medicineImageTypes[file.mimetype]) {
      throw new BadRequestException(
        'Only JPEG, PNG and WebP images are allowed.',
      );
    }

    // Check the file signature instead of trusting MIME type alone.
    const buffer = file.buffer;

    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47,
          0x0d, 0x0a, 0x1a, 0x0a,
        ]),
      );

    const isWebp =
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';

    const validSignature =
      (file.mimetype === 'image/jpeg' && isJpeg) ||
      (file.mimetype === 'image/png' && isPng) ||
      (file.mimetype === 'image/webp' && isWebp);

    if (!validSignature) {
      throw new BadRequestException(
        'The uploaded file does not match its image format.',
      );
    }
  }

  /**
   * Delete an old medicine image only when it belongs
   * to the medicine-images upload directory.
   */
  private async deleteMedicineImage(
    storedPath: string,
  ): Promise<boolean> {
    const normalized = storedPath.replace(/\\/g, '/');
    const expectedPrefix = 'medicine-images/';

    if (
      normalized.startsWith('/') ||
      normalized.includes('..') ||
      !normalized.startsWith(expectedPrefix)
    ) {
      this.logger.warn(
        `Skipped deletion of image outside medicine-images directory: ${storedPath}`,
      );
      return false;
    }

    const absolutePath = path.resolve(
      this.uploadDir,
      normalized,
    );

    const allowedDirectory = path.resolve(
      this.uploadDir,
      'medicine-images',
    );

    if (
      !absolutePath.startsWith(
        allowedDirectory + path.sep,
      )
    ) {
      this.logger.warn(
        `Skipped unsafe medicine image path: ${storedPath}`,
      );
      return false;
    }

    try {
      await fs.promises.unlink(absolutePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }

      this.logger.error(
        `Could not delete previous medicine image: ${error.message}`,
      );
      return false;
    }
  }

  private async deleteFileIfExists(
    absolutePath: string,
  ): Promise<void> {
    try {
      await fs.promises.unlink(absolutePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.error(
          `Could not clean up uploaded file: ${error.message}`,
        );
      }
    }
  }

  /**
   * Get a file extension from MIME type.
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
   * Resolve absolute path for a stored file.
   */
  getAbsolutePath(relativePath: string): string {
    return path.resolve(relativePath);
  }
}
