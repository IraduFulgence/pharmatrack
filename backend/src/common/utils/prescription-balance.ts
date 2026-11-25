// How much of each prescribed medicine is still allowed on a prescription.
// Shared by the sales point (dispensing) and patient online orders.

/**
 * SQL for the units of one medicine given out under one prescription: sold, minus anything
 * the patient returned. A refund marks the whole sale REFUNDED even when only part came back,
 * so those sales count too, net of returned_quantity.
 */
export const dispensedUnitsSql = (prescriptionIdExpr: string, medicineIdExpr: string) => `COALESCE((
  SELECT SUM(si.quantity - COALESCE(si.returned_quantity, 0))
  FROM public.sale_items si
  JOIN public.sales s ON s.sale_id = si.sale_id
  WHERE s.prescription_id = ${prescriptionIdExpr}
    AND s.sale_status IN ('COMPLETED', 'REFUNDED')
    AND si.medicine_id = ${medicineIdExpr}
), 0)`;

/**
 * SQL that sets a prescription ($1) to FULFILLED when nothing is left on it, or back to
 * ACTIVE after a refund leaves something to give out. Prescriptions that don't list their
 * medicines can't be tracked and are fulfilled by any sale.
 */
export const SYNC_PRESCRIPTION_STATUS_SQL = `
  UPDATE public.prescriptions pr
  SET status = CASE WHEN EXISTS (
        SELECT 1
        FROM public.prescription_items pi
        WHERE pi.prescription_id = pr.prescription_id
        GROUP BY pi.medicine_id
        HAVING SUM(pi.quantity) > ${dispensedUnitsSql('pr.prescription_id', 'pi.medicine_id')}
      ) THEN 'ACTIVE' ELSE 'FULFILLED' END
  WHERE pr.prescription_id = $1
    AND pr.status IN ('ACTIVE', 'FULFILLED')`;

export interface Queryable {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

export interface PrescribedMedicineBalance {
  medicineId: number;
  medicineName: string;
  strength: string | null;
  prescribed: number;
  /** Already given out by sales linked to this prescription (net of returns). */
  dispensed: number;
  /** Held by the patient's open online orders that quote this prescription. */
  reserved: number;
  /** What may still be dispensed or ordered (never below 0). */
  remaining: number;
}

/**
 * Per-medicine balance of a prescription. Pass `openOrders` to also count the
 * patient's open online orders quoting the prescription (used when ordering online;
 * the sales point counts only what has actually been dispensed).
 * Returns an empty list when the prescription does not list its medicines.
 */
export async function getPrescriptionBalance(
  db: Queryable,
  prescriptionId: number,
  openOrders?: { patientId: number; reference: string; excludeOrderId?: number | null },
): Promise<PrescribedMedicineBalance[]> {
  const res = await db.query(
    `SELECT
       pi.medicine_id,
       m.medicine_name,
       m.strength,
       SUM(pi.quantity)::INTEGER AS prescribed,
       ${dispensedUnitsSql('$1', 'pi.medicine_id')}::INTEGER AS dispensed,
       CASE WHEN $2::BIGINT IS NULL THEN 0 ELSE COALESCE((
         SELECT SUM(oi.quantity)
         FROM public.marketplace_order_items oi
         JOIN public.marketplace_orders o ON o.order_id = oi.order_id
         WHERE o.patient_id = $2
           AND LOWER(o.prescription_reference) = LOWER($3)
           AND o.status IN ('PENDING', 'ACCEPTED', 'READY_FOR_COLLECTION')
           AND ($4::BIGINT IS NULL OR o.order_id <> $4)
           AND oi.medicine_id = pi.medicine_id
       ), 0) END::INTEGER AS reserved
     FROM public.prescription_items pi
     JOIN public.medicines m ON m.medicine_id = pi.medicine_id
     WHERE pi.prescription_id = $1
     GROUP BY pi.medicine_id, m.medicine_name, m.strength
     ORDER BY MIN(pi.prescription_item_id)`,
    [
      prescriptionId,
      openOrders?.patientId ?? null,
      openOrders?.reference ?? null,
      openOrders?.excludeOrderId ?? null,
    ],
  );
  return res.rows.map((r: any) => {
    const prescribed = Number(r.prescribed);
    const dispensed = Number(r.dispensed);
    const reserved = Number(r.reserved);
    return {
      medicineId: Number(r.medicine_id),
      medicineName: r.medicine_name,
      strength: r.strength ?? null,
      prescribed,
      dispensed,
      reserved,
      remaining: Math.max(0, prescribed - dispensed - reserved),
    };
  });
}

/**
 * Problems with taking `wanted` (per medicine) against a prescription balance.
 * Empty when it fits. Only call when the prescription lists its medicines.
 */
export function prescriptionQuantityProblems(
  balance: PrescribedMedicineBalance[],
  wanted: Array<{ medicineId: number; medicineName: string; quantity: number }>,
): string[] {
  const byMedicine = new Map(balance.map((b) => [b.medicineId, b]));
  const totals = new Map<number, { name: string; quantity: number }>();
  for (const w of wanted) {
    const prev = totals.get(w.medicineId);
    totals.set(w.medicineId, { name: w.medicineName, quantity: (prev?.quantity || 0) + w.quantity });
  }
  const problems: string[] = [];
  for (const [medicineId, { name, quantity }] of totals) {
    const b = byMedicine.get(medicineId);
    if (!b) {
      problems.push(`${name} is not on this prescription.`);
      continue;
    }
    if (quantity <= b.remaining) continue;
    const used = b.dispensed + b.reserved;
    if (b.remaining === 0) {
      problems.push(
        `${name}: all ${b.prescribed} prescribed ${b.reserved > 0 && b.dispensed === 0 ? 'are already in another order' : 'have already been given out'}.`,
      );
    } else if (used > 0) {
      problems.push(
        `${name}: ${quantity} requested but only ${b.remaining} of the ${b.prescribed} prescribed are left (${used} already ${b.reserved > 0 ? 'given out or ordered' : 'given out'}).`,
      );
    } else {
      problems.push(`${name}: ${quantity} requested but only ${b.prescribed} prescribed.`);
    }
  }
  return problems;
}
