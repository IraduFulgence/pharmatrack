
import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class PatientsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Search the medicine catalogue.
   *
   * The medicine table has not yet been created or identified.
   * This method will be connected when that table is available.
   */
  async searchMedicines(name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Medicine name is required');
    }

    throw new ServiceUnavailableException(
      'Medicine search is not configured yet. The medicine catalogue table is required.',
    );
  }

  /**
   * Find pharmacies near the patient's location.
   * Uses the pharmacy coordinates stored in the database.
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

    if (medicineId) {
      throw new ServiceUnavailableException(
        'Medicine stock filtering is not configured yet. The inventory table is required.',
      );
    }

    const result = await this.db.query(
      `
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
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY distance_km ASC
      LIMIT 20
      `,
      [lat, lng],
    );

    return {
      success: true,
      message: 'Nearby pharmacies retrieved successfully',
      count: result.rows.length,
      pharmacies: result.rows,
    };
  }
}
