import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class PatientsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Search the medicine catalogue and find all pharmacies that have it in stock.
   */
  async searchMedicines(name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Medicine name is required');
    }

    const searchTerm = `%${name.trim().toLowerCase()}%`;

    // 1. Find the matching medicines in the catalogue
    const medicineResult = await this.db.query(
      `SELECT medicine_id, medicine_name, generic_name, brand_name, strength, dosage_form, requires_prescription
       FROM public.medicines
       WHERE LOWER(medicine_name) LIKE $1
          OR LOWER(generic_name) LIKE $1
          OR LOWER(brand_name) LIKE $1
       ORDER BY medicine_name ASC
       LIMIT 10`,
      [searchTerm],
    );

    if (medicineResult.rows.length === 0) {
      return {
        success: true,
        message: 'No medicines found with that name.',
        data: [],
      };
    }

    // 2. For each medicine found, find pharmacies that have it in stock
    const medicinesWithPharmacies = await Promise.all(
      medicineResult.rows.map(async (medicine) => {
        const pharmacyResult = await this.db.query(
          `SELECT
             p.pharmacy_id,
             p.pharmacy_name,
             p.phone_number,
             p.location_address,
             p.latitude,
             p.longitude,
             COALESCE(SUM(ib.quantity), 0)::INTEGER AS quantity_available,
             MIN(ib.unit_price) AS unit_price
           FROM public.inventory_batches ib
           JOIN public.pharmacies p ON p.pharmacy_id = ib.pharmacy_id
           WHERE ib.medicine_id = $1
             AND ib.quantity > 0
             AND p.is_active = TRUE
             AND p.verification_status = 'APPROVED'
             AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
           GROUP BY p.pharmacy_id, p.pharmacy_name, p.phone_number, p.location_address, p.latitude, p.longitude
           ORDER BY p.pharmacy_name ASC`,
          [medicine.medicine_id],
        );

        return {
          medicine,
          pharmacies: pharmacyResult.rows,
        };
      }),
    );

    return {
      success: true,
      message: 'Medicines retrieved successfully',
      data: medicinesWithPharmacies,
    };
  }

  /**
   * Find pharmacies near the patient's location.
   */
  async getNearbyPharmacies(
    latitude: string,
    longitude: string,
    medicineId?: string,
  ) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new BadRequestException(
        'Valid latitude and longitude are required',
      );
    }

    let query = `
      SELECT
        pharmacy_id,
        pharmacy_name,
        phone_number,
        email,
        location_address,
        latitude,
        longitude,
        (
          6371 * ACOS(
            LEAST(
              1,
              GREATEST(
                -1,
                COS(RADIANS($1))
                * COS(RADIANS(latitude))
                * COS(RADIANS(longitude) - RADIANS($2))
                + SIN(RADIANS($1))
                * SIN(RADIANS(latitude))
              )
            )
          )
        ) AS distance_km
      FROM public.pharmacies
      WHERE
        is_active = TRUE
        AND verification_status = 'APPROVED'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    `;

    const params: any[] = [lat, lng];

    // Optional filter by medicine stock
    if (medicineId) {
      query += `
        AND pharmacy_id IN (
          SELECT ib.pharmacy_id
          FROM public.inventory_batches ib
          WHERE ib.medicine_id = $3 AND ib.quantity > 0
        )
      `;
      params.push(Number(medicineId));
    }

    query += ` ORDER BY distance_km ASC LIMIT 20`;

    const result = await this.db.query(query, params);

    return {
      success: true,
      message: 'Nearby pharmacies retrieved successfully',
      count: result.rows.length,
      pharmacies: result.rows,
    };
  }
}