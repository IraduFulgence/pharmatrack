import type { Logger } from '@nestjs/common';
import type pg from 'pg';

/**
 * Test prescriptions for checking prescription (Rx) verification end to end.
 *
 * Runs at startup only when SEED_TEST_PRESCRIPTIONS=true. Safe to run again: it only adds what is
 * missing. Every patient (dependents included) gets three numbers, all built from their patient ID:
 *
 *   RX-TEST-<patientId>-A  ACTIVE   up to 3 prescription-only medicines in stock, 2 of each
 *   RX-TEST-<patientId>-B  ACTIVE   the first of those medicines, only 1 (to test ordering too many)
 *   RX-TEST-<patientId>-C  EXPIRED  issued 200 days ago (to test an expired prescription)
 *
 * Using another patient's number tests the "not on your account" check.
 */
export const TEST_PRESCRIPTIONS_SQL = `
DO $$
DECLARE
  meds BIGINT[];
  pt RECORD;
  rx_id BIGINT;
BEGIN
  -- Prescription-only medicines that an approved pharmacy can sell right now.
  SELECT ARRAY(
    SELECT m.medicine_id
    FROM public.medicines m
    WHERE m.requires_prescription = TRUE
      AND EXISTS (
        SELECT 1
        FROM public.inventory_batches ib
        JOIN public.pharmacies p ON p.pharmacy_id = ib.pharmacy_id
        WHERE ib.medicine_id = m.medicine_id
          AND ib.quantity > 0
          AND ib.status = 'ACTIVE'
          AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
          AND p.is_active = TRUE
          AND p.verification_status = 'APPROVED'
      )
    ORDER BY m.medicine_id
    LIMIT 3
  ) INTO meds;

  -- Nothing in stock: still create prescriptions, with any prescription-only medicines.
  IF COALESCE(array_length(meds, 1), 0) = 0 THEN
    SELECT ARRAY(
      SELECT medicine_id FROM public.medicines
      WHERE requires_prescription = TRUE
      ORDER BY medicine_id
      LIMIT 3
    ) INTO meds;
  END IF;

  IF COALESCE(array_length(meds, 1), 0) = 0 THEN
    RAISE NOTICE 'No prescription-only medicines found; no test prescriptions created.';
    RETURN;
  END IF;

  FOR pt IN SELECT patient_id FROM public.patients ORDER BY patient_id LOOP
    -- A: active, every chosen medicine, 2 of each.
    rx_id := NULL;
    INSERT INTO public.prescriptions (patient_id, prescription_reference, issued_date, status, created_at)
    SELECT pt.patient_id, 'RX-TEST-' || pt.patient_id || '-A', CURRENT_DATE, 'ACTIVE', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE LOWER(prescription_reference) = LOWER('RX-TEST-' || pt.patient_id || '-A')
    )
    RETURNING prescription_id INTO rx_id;
    IF rx_id IS NOT NULL THEN
      INSERT INTO public.prescription_items (prescription_id, medicine_id, quantity, dosage_instructions)
      SELECT rx_id, med, 2, 'Test prescription: 1 tablet twice a day after meals'
      FROM unnest(meds) AS med;
    END IF;

    -- B: active, only 1 of the first medicine.
    rx_id := NULL;
    INSERT INTO public.prescriptions (patient_id, prescription_reference, issued_date, status, created_at)
    SELECT pt.patient_id, 'RX-TEST-' || pt.patient_id || '-B', CURRENT_DATE, 'ACTIVE', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE LOWER(prescription_reference) = LOWER('RX-TEST-' || pt.patient_id || '-B')
    )
    RETURNING prescription_id INTO rx_id;
    IF rx_id IS NOT NULL THEN
      INSERT INTO public.prescription_items (prescription_id, medicine_id, quantity, dosage_instructions)
      VALUES (rx_id, meds[1], 1, 'Test prescription: a single dose');
    END IF;

    -- C: expired (skipped if this database doesn't allow the EXPIRED status).
    rx_id := NULL;
    BEGIN
    INSERT INTO public.prescriptions (patient_id, prescription_reference, issued_date, status, created_at)
    SELECT pt.patient_id, 'RX-TEST-' || pt.patient_id || '-C', CURRENT_DATE - 200, 'EXPIRED', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE LOWER(prescription_reference) = LOWER('RX-TEST-' || pt.patient_id || '-C')
    )
    RETURNING prescription_id INTO rx_id;
    IF rx_id IS NOT NULL THEN
      INSERT INTO public.prescription_items (prescription_id, medicine_id, quantity, dosage_instructions)
      VALUES (rx_id, meds[1], 2, 'Test prescription: expired');
    END IF;
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'EXPIRED status not allowed; skipped RX-TEST-%-C', pt.patient_id;
    END;
  END LOOP;
END $$;
`;

/** Adds the test prescriptions and logs how many exist, with an example number. */
export async function seedTestPrescriptions(pool: pg.Pool, logger: Logger): Promise<void> {
  await pool.query(TEST_PRESCRIPTIONS_SQL);
  const res = await pool.query(
    `SELECT COUNT(*)::INTEGER AS total, MIN(prescription_reference) AS example
     FROM public.prescriptions
     WHERE prescription_reference LIKE 'RX-TEST-%'`,
  );
  const { total, example } = res.rows[0] || {};
  logger.log(
    `Test prescriptions ready: ${total ?? 0} (RX-TEST-<patientId>-A/B/C${example ? `, e.g. ${example}` : ''}).`,
  );
}
