
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class PatientsService {
  constructor(private readonly db: DatabaseService) {}

  // ─────────────────────────────────────────
  // NORMAL MEDICINE SEARCH
  // ─────────────────────────────────────────

  /**
   * Search the medicine catalogue and find pharmacies
   * that currently have the medicine in stock.
   */
  async searchMedicines(name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Medicine name is required');
    }

    const searchTerm = `%${name.trim().toLowerCase()}%`;

    const medicineResult = await this.db.query(
      `SELECT
         medicine_id,
         medicine_name,
         generic_name,
         brand_name,
         strength,
         dosage_form,
         requires_prescription
       FROM public.medicines
       WHERE LOWER(medicine_name) LIKE $1
          OR LOWER(COALESCE(generic_name, '')) LIKE $1
          OR LOWER(COALESCE(brand_name, '')) LIKE $1
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

    const medicinesWithPharmacies = await Promise.all(
      medicineResult.rows.map(async (medicine: any) => {
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
           JOIN public.pharmacies p
             ON p.pharmacy_id = ib.pharmacy_id
           WHERE ib.medicine_id = $1
             AND ib.quantity > 0
             AND ib.status = 'ACTIVE'
             AND p.is_active = TRUE
             AND p.verification_status = 'APPROVED'
             AND (
               ib.expiry_date IS NULL
               OR ib.expiry_date >= CURRENT_DATE
             )
           GROUP BY
             p.pharmacy_id,
             p.pharmacy_name,
             p.phone_number,
             p.location_address,
             p.latitude,
             p.longitude
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

  // ─────────────────────────────────────────
  // INTELLIGENT MEDICINE SEARCH
  // ─────────────────────────────────────────

  /**
   * Normalize a category/search phrase.
   *
   * This does not create synonyms or classify medicines.
   * It only standardizes the text entered by the patient
   * so it can be compared with pharmacy-submitted labels.
   */
  private normalizeSearchTerm(searchTerm: string): string {
    return searchTerm
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Intelligent medicine search.
   *
   * Searches:
   * 1. Medicine name.
   * 2. Generic name.
   * 3. Brand name.
   * 4. Globally collected pharmacy category labels linked
   *    to the medicine.
   *
   * Historical category labels remain searchable even after
   * a pharmacy changes its current category.
   *
   * Results are limited to medicines with available stock
   * in active, approved pharmacies.
   */
  async intelligentSearchMedicines(name: string) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException(
        'A medicine name or category is required.',
      );
    }

    const searchTerm = name.trim();

    if (searchTerm.length > 150) {
      throw new BadRequestException(
        'Search text must be 150 characters or fewer.',
      );
    }

    const normalizedSearchTerm =
      this.normalizeSearchTerm(searchTerm);

    const medicinePattern =
      `%${searchTerm.toLowerCase()}%`;

    const categoryPattern =
      `%${normalizedSearchTerm}%`;

    const result = await this.db.query(
      `SELECT
         m.medicine_id,
         m.medicine_name,
         m.generic_name,
         m.brand_name,
         m.strength,
         m.dosage_form,
         m.requires_prescription,

         pmc.category AS current_category,

         p.pharmacy_id,
         p.pharmacy_name,
         p.phone_number,
         p.email,
         p.location_address,
         p.latitude,
         p.longitude,

         COALESCE(SUM(ib.quantity), 0)::INTEGER
           AS quantity_available,

         MIN(ib.unit_price) AS unit_price

       FROM public.medicines m

       JOIN public.pharmacies p
         ON p.is_active = TRUE
        AND p.verification_status = 'APPROVED'

       JOIN public.inventory_batches ib
         ON ib.medicine_id = m.medicine_id
        AND ib.pharmacy_id = p.pharmacy_id

       LEFT JOIN public.pharmacy_medicine_categories pmc
         ON pmc.medicine_id = m.medicine_id
        AND pmc.pharmacy_id = p.pharmacy_id

       WHERE
         (
           LOWER(m.medicine_name) LIKE $1
           OR LOWER(COALESCE(m.generic_name, '')) LIKE $1
           OR LOWER(COALESCE(m.brand_name, '')) LIKE $1

           OR EXISTS (
             SELECT 1
             FROM public.pharmatrack_medicine_category_terms mt

             JOIN public.pharmatrack_categories c
               ON c.category_id = mt.category_id

             WHERE mt.medicine_id = m.medicine_id
               AND (
                 LOWER(c.category) LIKE $2
                 OR LOWER(c.normalized_category) LIKE $2
               )
           )
         )

         AND ib.quantity > 0
         AND ib.status = 'ACTIVE'

         AND (
           ib.expiry_date IS NULL
           OR ib.expiry_date >= CURRENT_DATE
         )

       GROUP BY
         m.medicine_id,
         m.medicine_name,
         m.generic_name,
         m.brand_name,
         m.strength,
         m.dosage_form,
         m.requires_prescription,
         pmc.category,
         p.pharmacy_id,
         p.pharmacy_name,
         p.phone_number,
         p.email,
         p.location_address,
         p.latitude,
         p.longitude

       HAVING SUM(ib.quantity) > 0

       ORDER BY
         CASE
           WHEN LOWER(m.medicine_name) = LOWER($3) THEN 0
           WHEN LOWER(COALESCE(m.generic_name, '')) = LOWER($3) THEN 1
           WHEN LOWER(COALESCE(m.brand_name, '')) = LOWER($3) THEN 2
           ELSE 3
         END,
         p.pharmacy_name ASC,
         m.medicine_name ASC

       LIMIT 100`,
      [
        medicinePattern,
        categoryPattern,
        searchTerm,
      ],
    );

    if (result.rows.length === 0) {
      return {
        success: true,
        message:
          'No matching medicines with available stock were found.',
        searchTerm,
        normalizedSearchTerm,
        count: 0,
        data: [],
      };
    }

    const grouped = new Map<string, any>();

    for (const row of result.rows) {
      const key =
        `${row.medicine_id}:${row.pharmacy_id}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          medicine: {
            medicineId: Number(row.medicine_id),
            medicineName: row.medicine_name,
            genericName: row.generic_name,
            brandName: row.brand_name,
            strength: row.strength,
            dosageForm: row.dosage_form,
            requiresPrescription:
              row.requires_prescription,
          },

          pharmacy: {
            pharmacyId: Number(row.pharmacy_id),
            pharmacyName: row.pharmacy_name,
            phoneNumber: row.phone_number,
            email: row.email,
            locationAddress: row.location_address,

            latitude:
              row.latitude === null
                ? null
                : Number(row.latitude),

            longitude:
              row.longitude === null
                ? null
                : Number(row.longitude),

            quantityAvailable:
              Number(row.quantity_available),

            unitPrice:
              row.unit_price === null
                ? null
                : Number(row.unit_price),

            currentCategory:
              row.current_category ?? null,
          },
        });
      }
    }

    const data = Array.from(grouped.values());

    return {
      success: true,
      message:
        'Intelligent medicine search completed successfully.',
      searchTerm,
      normalizedSearchTerm,
      count: data.length,
      data,

      notes: [
        'Medicine names are matched against the medicine catalogue.',
        'Category searches use pharmacy-submitted labels collected globally.',
        'Historical category labels remain linked to their medicines.',
        'The category displayed for a pharmacy is its current assigned category.',
        'A category match does not mean medicines are interchangeable.',
        'Availability reflects recorded active, unexpired stock.',
        'Contact the pharmacy to confirm availability before travelling.',
      ],
    };
  }

  // ─────────────────────────────────────────
  // MULTIPLE-MEDICINE SEARCH
  // ─────────────────────────────────────────

  private calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRadians = (value: number) =>
      (value * Math.PI) / 180;

    const earthRadiusKm = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return (
      earthRadiusKm *
      2 *
      Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
  }

  /**
   * Search for several medicines and recommend:
   * 1. One pharmacy within 5 km with every requested medicine.
   * 2. A small group of pharmacies within 5 km that collectively
   *    covers every requested medicine.
   * 3. One or more pharmacies outside 5 km with every medicine.
   *
   * Distances are straight-line estimates, not road distances.
   */
  async searchMultipleMedicines(input: {
    medicines: string[];
    latitude: number | string;
    longitude: number | string;
  }) {
    const NEARBY_RADIUS_KM = 5;
    const MAX_MEDICINES = 10;
    const MAX_GROUP_SIZE = 4;
    const MAX_GROUP_CANDIDATES = 24;

    if (!Array.isArray(input?.medicines)) {
      throw new BadRequestException(
        'Medicines must be provided as an array.',
      );
    }

    if (
      input.medicines.some(
        (name) =>
          typeof name !== 'string' ||
          name.trim().length === 0,
      )
    ) {
      throw new BadRequestException(
        'Every medicine must have a non-empty name.',
      );
    }

    const requestedMedicines = Array.from(
      new Map(
        input.medicines
          .map((name) => name.trim())
          .map((name) => [
            name.toLocaleLowerCase(),
            name,
          ]),
      ).values(),
    );

    if (
      requestedMedicines.length === 0 ||
      requestedMedicines.length > MAX_MEDICINES
    ) {
      throw new BadRequestException(
        `Provide between 1 and ${MAX_MEDICINES} different medicine names.`,
      );
    }

    if (
      requestedMedicines.some(
        (name) => name.length > 150,
      )
    ) {
      throw new BadRequestException(
        'Each medicine name must be 150 characters or fewer.',
      );
    }

    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException(
        'Valid patient latitude and longitude are required.',
      );
    }

    // Resolve each requested term independently.
    const medicineMatches = await Promise.all(
      requestedMedicines.map(async (requestedName) => {
        const result = await this.db.query(
          `SELECT
             medicine_id,
             medicine_name,
             generic_name,
             brand_name,
             strength,
             dosage_form,
             requires_prescription
           FROM public.medicines
           WHERE LOWER(medicine_name) LIKE $1
              OR LOWER(COALESCE(generic_name, '')) LIKE $1
              OR LOWER(COALESCE(brand_name, '')) LIKE $1
           ORDER BY
             CASE
               WHEN LOWER(medicine_name) = LOWER($2) THEN 0
               WHEN LOWER(COALESCE(generic_name, '')) = LOWER($2) THEN 1
               WHEN LOWER(COALESCE(brand_name, '')) = LOWER($2) THEN 2
               ELSE 3
             END,
             medicine_name ASC
           LIMIT 20`,
          [
            `%${requestedName.toLowerCase()}%`,
            requestedName,
          ],
        );

        return {
          requestedName,
          matches: result.rows,
          medicineIds: result.rows.map(
            (medicine: any) =>
              Number(medicine.medicine_id),
          ),
        };
      }),
    );

    const unresolvedMedicines = medicineMatches
      .filter((item) => item.matches.length === 0)
      .map((item) => item.requestedName);

    const allMedicineIds = Array.from(
      new Set(
        medicineMatches.flatMap(
          (item) => item.medicineIds,
        ),
      ),
    );

    if (allMedicineIds.length === 0) {
      return {
        success: true,
        message:
          'No matching medicines were found in the catalogue.',
        nearbyRadiusKm: NEARBY_RADIUS_KM,
        requestedMedicines,

        medicineMatches: medicineMatches.map(
          (item) => ({
            requestedName: item.requestedName,
            matches: item.matches,
          }),
        ),

        singleNearbyPharmacies: [],
        nearbyPharmacyGroups: [],
        singleFartherPharmacies: [],
        unfulfilledMedicines: unresolvedMedicines,
      };
    }

    // Stock must be positive, active, unexpired, and held by an
    // active, approved pharmacy.
    const stockResult = await this.db.query(
      `SELECT
         p.pharmacy_id,
         p.pharmacy_name,
         p.phone_number,
         p.email,
         p.location_address,
         p.latitude,
         p.longitude,
         ib.medicine_id,
         COALESCE(SUM(ib.quantity), 0)::INTEGER AS quantity_available,
         MIN(ib.unit_price) AS lowest_unit_price
       FROM public.inventory_batches ib
       JOIN public.pharmacies p
         ON p.pharmacy_id = ib.pharmacy_id
       WHERE ib.medicine_id = ANY($1::INTEGER[])
         AND ib.quantity > 0
         AND ib.status = 'ACTIVE'
         AND (
           ib.expiry_date IS NULL
           OR ib.expiry_date >= CURRENT_DATE
         )
         AND p.is_active = TRUE
         AND p.verification_status = 'APPROVED'
       GROUP BY
         p.pharmacy_id,
         p.pharmacy_name,
         p.phone_number,
         p.email,
         p.location_address,
         p.latitude,
         p.longitude,
         ib.medicine_id
       HAVING SUM(ib.quantity) > 0`,
      [allMedicineIds],
    );

    const pharmaciesById = new Map<number, any>();

    for (const row of stockResult.rows) {
      const pharmacyId = Number(row.pharmacy_id);
      const medicineId = Number(row.medicine_id);

      const pharmacyLat = Number(row.latitude);
      const pharmacyLng = Number(row.longitude);

      if (
        row.latitude === null ||
        row.longitude === null ||
        !Number.isFinite(pharmacyLat) ||
        !Number.isFinite(pharmacyLng) ||
        pharmacyLat < -90 ||
        pharmacyLat > 90 ||
        pharmacyLng < -180 ||
        pharmacyLng > 180
      ) {
        continue;
      }

      if (!pharmaciesById.has(pharmacyId)) {
        const distanceKm = this.calculateDistanceKm(
          latitude,
          longitude,
          pharmacyLat,
          pharmacyLng,
        );

        pharmaciesById.set(pharmacyId, {
          pharmacyId,
          pharmacyName: row.pharmacy_name,
          phoneNumber: row.phone_number,
          email: row.email,
          locationAddress: row.location_address,
          latitude: pharmacyLat,
          longitude: pharmacyLng,
          distanceKm: Number(distanceKm.toFixed(2)),
          stockedMedicines: new Map<number, any>(),
          coveredTerms: new Set<string>(),
        });
      }

      pharmaciesById
        .get(pharmacyId)
        .stockedMedicines.set(medicineId, {
          medicineId,
          quantityAvailable: Number(
            row.quantity_available,
          ),
          lowestUnitPrice:
            row.lowest_unit_price === null
              ? null
              : Number(row.lowest_unit_price),
        });
    }

    const medicineIdsByTerm =
      new Map<string, Set<number>>();

    const medicineDetailsById =
      new Map<number, any>();

    for (const item of medicineMatches) {
      medicineIdsByTerm.set(
        item.requestedName,
        new Set(item.medicineIds),
      );

      for (const medicine of item.matches) {
        medicineDetailsById.set(
          Number(medicine.medicine_id),
          medicine,
        );
      }
    }

    const pharmacies = Array.from(
      pharmaciesById.values(),
    );

    for (const pharmacy of pharmacies) {
      for (const [
        requestedName,
        medicineIds,
      ] of medicineIdsByTerm) {
        const hasStock = Array.from(
          medicineIds,
        ).some((medicineId) => {
          const stock =
            pharmacy.stockedMedicines.get(medicineId);

          return stock && stock.quantityAvailable > 0;
        });

        if (hasStock) {
          pharmacy.coveredTerms.add(requestedName);
        }
      }
    }

    const isComplete = (pharmacy: any) =>
      requestedMedicines.every((name) =>
        pharmacy.coveredTerms.has(name),
      );

    const formatPharmacy = (pharmacy: any) => {
      const availableMedicines =
        requestedMedicines.map((requestedName) => {
          const ids =
            medicineIdsByTerm.get(requestedName) ||
            new Set<number>();

          const matches = Array.from(ids)
            .filter((id) =>
              pharmacy.stockedMedicines.has(id),
            )
            .map((id) => {
              const medicine =
                medicineDetailsById.get(id);

              const stock =
                pharmacy.stockedMedicines.get(id);

              return {
                medicineId: id,
                medicineName: medicine?.medicine_name,
                genericName: medicine?.generic_name,
                brandName: medicine?.brand_name,
                strength: medicine?.strength,
                dosageForm: medicine?.dosage_form,
                quantityAvailable:
                  stock.quantityAvailable,
                lowestUnitPrice:
                  stock.lowestUnitPrice,
              };
            });

          return {
            requestedName,
            available: matches.length > 0,
            matches,
          };
        });

      return {
        pharmacyId: pharmacy.pharmacyId,
        pharmacyName: pharmacy.pharmacyName,
        phoneNumber: pharmacy.phoneNumber,
        email: pharmacy.email,
        locationAddress: pharmacy.locationAddress,
        latitude: pharmacy.latitude,
        longitude: pharmacy.longitude,
        distanceKm: pharmacy.distanceKm,
        availableMedicines,

        missingMedicines: availableMedicines
          .filter((item) => !item.available)
          .map((item) => item.requestedName),
      };
    };

    const nearbyPharmacies = pharmacies
      .filter(
        (pharmacy) =>
          pharmacy.distanceKm <= NEARBY_RADIUS_KM,
      )
      .sort(
        (a, b) => a.distanceKm - b.distanceKm,
      );

    const singleNearby = nearbyPharmacies
      .filter(isComplete)
      .sort(
        (a, b) => a.distanceKm - b.distanceKm,
      );

    const singleFarther = pharmacies
      .filter(
        (pharmacy) =>
          pharmacy.distanceKm > NEARBY_RADIUS_KM,
      )
      .filter(isComplete)
      .sort(
        (a, b) => a.distanceKm - b.distanceKm,
      );

    // Find the smallest nearby group (up to four pharmacies).
    const bestGroupState: {
      value: any[] | null;
    } = {
      value: null,
    };

    let bestGroupDistance =
      Number.POSITIVE_INFINITY;

    if (singleNearby.length === 0) {
      const candidates = nearbyPharmacies
        .filter(
          (pharmacy) =>
            pharmacy.coveredTerms.size > 0,
        )
        .slice(0, MAX_GROUP_CANDIDATES);

      const estimateRouteDistance = (
        group: any[],
      ) => {
        let bestDistance =
          Number.POSITIVE_INFINITY;

        for (const first of group) {
          const remaining = group.filter(
            (item) =>
              item.pharmacyId !== first.pharmacyId,
          );

          let current = first;

          let distance = this.calculateDistanceKm(
            latitude,
            longitude,
            current.latitude,
            current.longitude,
          );

          while (remaining.length > 0) {
            let nearestIndex = 0;

            let nearestDistance =
              Number.POSITIVE_INFINITY;

            remaining.forEach(
              (candidate: any, index: number) => {
                const candidateDistance =
                  this.calculateDistanceKm(
                    current.latitude,
                    current.longitude,
                    candidate.latitude,
                    candidate.longitude,
                  );

                if (
                  candidateDistance < nearestDistance
                ) {
                  nearestDistance =
                    candidateDistance;

                  nearestIndex = index;
                }
              },
            );

            current = remaining.splice(
              nearestIndex,
              1,
            )[0];

            distance += nearestDistance;
          }

          bestDistance = Math.min(
            bestDistance,
            distance,
          );
        }

        return bestDistance;
      };

      const combinations = (
        start: number,
        size: number,
        selected: any[],
      ) => {
        if (selected.length === size) {
          const covered = new Set<string>();

          selected.forEach((pharmacy) => {
            pharmacy.coveredTerms.forEach(
              (term: string) => covered.add(term),
            );
          });

          if (
            !requestedMedicines.every(
              (name) => covered.has(name),
            )
          ) {
            return;
          }

          const distance =
            estimateRouteDistance(selected);

          if (distance < bestGroupDistance) {
            bestGroupDistance = distance;
            bestGroupState.value = [...selected];
          }

          return;
        }

        const needed = size - selected.length;

        for (
          let index = start;
          index <= candidates.length - needed;
          index += 1
        ) {
          combinations(
            index + 1,
            size,
            [...selected, candidates[index]],
          );
        }
      };

      for (
        let groupSize = 2;
        groupSize <=
        Math.min(
          MAX_GROUP_SIZE,
          candidates.length,
        );
        groupSize += 1
      ) {
        combinations(0, groupSize, []);

        if (bestGroupState.value !== null) {
          break;
        }
      }
    }

    const selectedBestGroup =
      bestGroupState.value;

    const nearbyPharmacyGroups =
      selectedBestGroup !== null
        ? [
            {
              pharmacyCount:
                selectedBestGroup.length,

              estimatedCombinedDistanceKm:
                Number(
                  bestGroupDistance.toFixed(2),
                ),

              pharmacies: selectedBestGroup
                .slice()
                .sort(
                  (a: any, b: any) =>
                    a.distanceKm - b.distanceKm,
                )
                .map(formatPharmacy),
            },
          ]
        : [];

    const coveredAnywhere =
      new Set<string>();

    pharmacies.forEach((pharmacy) => {
      pharmacy.coveredTerms.forEach(
        (term: string) =>
          coveredAnywhere.add(term),
      );
    });

    const unfulfilledMedicines =
      requestedMedicines.filter(
        (name) => !coveredAnywhere.has(name),
      );

    return {
      success: true,
      message:
        'Multiple-medicine search completed successfully.',
      nearbyRadiusKm: NEARBY_RADIUS_KM,

      distanceMethod:
        'Straight-line Haversine distance; actual road distance may differ.',

      requestedMedicines,

      medicineMatches: medicineMatches.map(
        (item) => ({
          requestedName: item.requestedName,
          matches: item.matches,
        }),
      ),

      singleNearbyPharmacies:
        singleNearby.map(formatPharmacy),

      nearbyPharmacyGroups,

      singleFartherPharmacies:
        singleFarther.map(formatPharmacy),

      unfulfilledMedicines: Array.from(
        new Set([
          ...unresolvedMedicines,
          ...unfulfilledMedicines,
        ]),
      ),

      notes: [
        'Availability is based on recorded active, unexpired inventory.',
        'Contact the pharmacy to confirm stock before travelling.',
        'Check the returned strength and dosage form before selecting a medicine.',
      ],
    };
  }

  // ─────────────────────────────────────────
  // NEARBY PHARMACIES
  // ─────────────────────────────────────────

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

    if (medicineId) {
      const parsedMedicineId = Number(medicineId);

      if (
        !Number.isInteger(parsedMedicineId) ||
        parsedMedicineId <= 0
      ) {
        throw new BadRequestException(
          'A valid medicine ID is required.',
        );
      }

      query += `
        AND pharmacy_id IN (
          SELECT ib.pharmacy_id
          FROM public.inventory_batches ib
          WHERE ib.medicine_id = $3
            AND ib.quantity > 0
            AND ib.status = 'ACTIVE'
            AND (
              ib.expiry_date IS NULL
              OR ib.expiry_date >= CURRENT_DATE
            )
        )
      `;

      params.push(parsedMedicineId);
    }

    query += ` ORDER BY distance_km ASC LIMIT 20`;

    const result = await this.db.query(
      query,
      params,
    );

    return {
      success: true,
      message:
        'Nearby pharmacies retrieved successfully',
      count: result.rows.length,
      pharmacies: result.rows,
    };
  }

  // ─────────────────────────────────────────
  // PATIENT CHAT
  // ─────────────────────────────────────────

  /**
   * Start a conversation with a pharmacy.
   * One patient has one shared conversation per pharmacy.
   */
  async startChat(
    patientUserId: number,
    pharmacyId: number,
  ) {
    if (
      !Number.isInteger(pharmacyId) ||
      pharmacyId <= 0
    ) {
      throw new BadRequestException(
        'A valid pharmacy ID is required.',
      );
    }

    const pharmacyResult = await this.db.query(
      `SELECT pharmacy_id, pharmacy_name
       FROM public.pharmacies
       WHERE pharmacy_id = $1
         AND is_active = TRUE
         AND verification_status = 'APPROVED'`,
      [pharmacyId],
    );

    if (pharmacyResult.rows.length === 0) {
      throw new NotFoundException(
        'Active approved pharmacy not found.',
      );
    }

    const result = await this.db.query(
      `INSERT INTO public.patient_chats
         (
           patient_user_id,
           pharmacy_id,
           created_at,
           updated_at
         )
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (patient_user_id, pharmacy_id)
       DO UPDATE SET
         updated_at = public.patient_chats.updated_at
       RETURNING
         chat_id,
         patient_user_id,
         pharmacy_id,
         created_at,
         updated_at`,
      [patientUserId, pharmacyId],
    );

    return {
      success: true,
      message:
        'Chat conversation opened successfully.',
      data: {
        ...result.rows[0],
        pharmacy_name:
          pharmacyResult.rows[0].pharmacy_name,
      },
    };
  }

  /**
   * Retrieve all conversations belonging to a patient.
   */
  async getPatientChats(patientUserId: number) {
    const result = await this.db.query(
      `SELECT
         c.chat_id,
         c.patient_user_id,
         c.pharmacy_id,
         c.status,
         p.pharmacy_name,
         p.phone_number,
         c.created_at,
         c.updated_at,
         (
           SELECT m.message
           FROM public.patient_chat_messages m
           WHERE m.chat_id = c.chat_id
           ORDER BY
             m.created_at DESC,
             m.message_id DESC
           LIMIT 1
         ) AS last_message,
         (
           SELECT m.sender_role
           FROM public.patient_chat_messages m
           WHERE m.chat_id = c.chat_id
           ORDER BY
             m.created_at DESC,
             m.message_id DESC
           LIMIT 1
         ) AS last_sender_role,
         (
           SELECT m.created_at
           FROM public.patient_chat_messages m
           WHERE m.chat_id = c.chat_id
           ORDER BY
             m.created_at DESC,
             m.message_id DESC
           LIMIT 1
         ) AS last_message_at
       FROM public.patient_chats c
       JOIN public.pharmacies p
         ON p.pharmacy_id = c.pharmacy_id
       WHERE c.patient_user_id = $1
       ORDER BY c.updated_at DESC`,
      [patientUserId],
    );

    return {
      success: true,
      message:
        'Your conversations were retrieved successfully.',
      count: result.rows.length,
      data: result.rows,
    };
  }

  /**
   * Retrieve messages from a patient's conversation.
   * Patients can only access their own conversations.
   */
  async getPatientChatMessages(
    patientUserId: number,
    chatId: number,
  ) {
    const chat = await this.db.query(
      `SELECT
         c.chat_id,
         c.status,
         c.pharmacy_id,
         p.pharmacy_name,
         p.phone_number
       FROM public.patient_chats c
       JOIN public.pharmacies p
         ON p.pharmacy_id = c.pharmacy_id
       WHERE c.chat_id = $1
         AND c.patient_user_id = $2`,
      [chatId, patientUserId],
    );

    if (chat.rows.length === 0) {
      throw new NotFoundException(
        'Chat conversation not found.',
      );
    }

    const result = await this.db.query(
      `SELECT
         m.message_id,
         m.chat_id,
         m.sender_user_id,
         m.sender_role,
         m.sender_email,
         m.message,
         m.created_at,
         m.edited_at,
         CASE
           WHEN m.sender_role = 'PHARMACY'
           THEN pu.full_name
         END AS sender_name
       FROM public.patient_chat_messages m
       LEFT JOIN public.pharmacy_users pu
         ON m.sender_role = 'PHARMACY'
        AND pu.pharmacy_user_id = m.sender_user_id
       WHERE m.chat_id = $1
       ORDER BY
         m.created_at ASC,
         m.message_id ASC`,
      [chatId],
    );

    return {
      success: true,
      message:
        'Chat messages retrieved successfully.',
      count: result.rows.length,
      conversation: chat.rows[0],
      data: result.rows,
    };
  }

  /**
   * Send a message to a pharmacy.
   */
  async sendPatientChatMessage(
    patientUserId: number,
    patientEmail: string,
    chatId: number,
    message: string,
  ) {
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      throw new BadRequestException(
        'Message cannot be empty.',
      );
    }

    if (cleanMessage.length > 5000) {
      throw new BadRequestException(
        'Message cannot exceed 5000 characters.',
      );
    }

    const chat = await this.db.query(
      `SELECT chat_id, status
       FROM public.patient_chats
       WHERE chat_id = $1
         AND patient_user_id = $2`,
      [chatId, patientUserId],
    );

    if (chat.rows.length === 0) {
      throw new NotFoundException(
        'Chat conversation not found.',
      );
    }

    if (
      String(chat.rows[0].status || '').toUpperCase() ===
      'CLOSED'
    ) {
      throw new BadRequestException(
        'This conversation is closed.',
      );
    }

    const result = await this.db.query(
      `INSERT INTO public.patient_chat_messages
         (
           chat_id,
           sender_user_id,
           sender_role,
           sender_email,
           message,
           created_at
         )
       VALUES ($1, $2, 'PATIENT', $3, $4, NOW())
       RETURNING
         message_id,
         chat_id,
         sender_user_id,
         sender_role,
         sender_email,
         message,
         created_at,
         edited_at`,
      [
        chatId,
        patientUserId,
        patientEmail,
        cleanMessage,
      ],
    );

    await this.db.query(
      `UPDATE public.patient_chats
       SET updated_at = NOW()
       WHERE chat_id = $1`,
      [chatId],
    );

    return {
      success: true,
      message: 'Message sent successfully.',
      data: result.rows[0],
    };
  }

  /**
   * Edit a patient's own message.
   * Editing is allowed only within 10 minutes after creation.
   */
  async editPatientChatMessage(
    patientUserId: number,
    chatId: number,
    messageId: number,
    message: string,
  ) {
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      throw new BadRequestException(
        'Message cannot be empty.',
      );
    }

    if (cleanMessage.length > 5000) {
      throw new BadRequestException(
        'Message cannot exceed 5000 characters.',
      );
    }

    const result = await this.db.query(
      `UPDATE public.patient_chat_messages AS m
       SET
         message = $1,
         edited_at = NOW()
       FROM public.patient_chats AS c
       WHERE m.chat_id = c.chat_id
         AND m.message_id = $2
         AND m.chat_id = $3
         AND c.patient_user_id = $4
         AND m.sender_user_id = $4
         AND m.sender_role = 'PATIENT'
         AND m.created_at >= NOW() - INTERVAL '10 minutes'
       RETURNING
         m.message_id,
         m.chat_id,
         m.sender_user_id,
         m.sender_role,
         m.message,
         m.created_at,
         m.edited_at`,
      [
        cleanMessage,
        messageId,
        chatId,
        patientUserId,
      ],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException(
        'Message could not be edited. Make sure it belongs to you and was sent within the last 10 minutes.',
      );
    }

    return {
      success: true,
      message: 'Message edited successfully.',
      data: result.rows[0],
    };
  }
}
