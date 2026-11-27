-- Migration 009: Pharmacy Data Isolation
-- Ensures each pharmacy manages its own medicines and stock independently.
-- 1. Adds pharmacy_id to public.medicines
-- 2. Scopes unique constraints to (pharmacy_id, medicine_name, ...)
-- 3. Enforces unique constraint on pharmacy_insurances (pharmacy_id, insurance_id)
-- 4. Creates performance indexes on pharmacy_id across inventory_batches, medicines, and transactions.

-- 1. Add pharmacy_id to medicines
ALTER TABLE public.medicines 
  ADD COLUMN IF NOT EXISTS pharmacy_id BIGINT REFERENCES public.pharmacies(pharmacy_id) ON DELETE CASCADE;

-- 2. Drop global unique constraint on medicines
ALTER TABLE public.medicines 
  DROP CONSTRAINT IF EXISTS medicines_medicine_name_strength_dosage_form_brand_name_key;

-- 3. Scoped unique indexes for medicines
CREATE UNIQUE INDEX IF NOT EXISTS uq_medicines_pharmacy_scoped 
ON public.medicines (
  pharmacy_id, 
  LOWER(medicine_name), 
  COALESCE(LOWER(strength), ''), 
  COALESCE(LOWER(dosage_form), ''), 
  COALESCE(LOWER(brand_name), '')
) 
WHERE pharmacy_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_medicines_global_catalogue 
ON public.medicines (
  LOWER(medicine_name), 
  COALESCE(LOWER(strength), ''), 
  COALESCE(LOWER(dosage_form), ''), 
  COALESCE(LOWER(brand_name), '')
) 
WHERE pharmacy_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_medicines_pharmacy_id ON public.medicines (pharmacy_id);

-- 4. Pharmacy insurances: ensure table, unique constraint on (pharmacy_id, insurance_id), and indexes
CREATE TABLE IF NOT EXISTS public.pharmacy_insurances (
  pharmacy_insurance_id BIGSERIAL PRIMARY KEY,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE CASCADE,
  insurance_id BIGINT NOT NULL REFERENCES public.insurance_providers(provider_id) ON DELETE RESTRICT,
  coverage_percentage NUMERIC(5,2) NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_pharmacy_insurances UNIQUE (pharmacy_id, insurance_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_pharmacy_insurances'
  ) THEN
    ALTER TABLE public.pharmacy_insurances ADD CONSTRAINT uq_pharmacy_insurances UNIQUE (pharmacy_id, insurance_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pharmacy_insurances_pharmacy ON public.pharmacy_insurances (pharmacy_id);

-- 5. Inventory batches performance indexes
CREATE INDEX IF NOT EXISTS idx_inventory_batches_pharmacy ON public.inventory_batches (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_pharm_med ON public.inventory_batches (pharmacy_id, medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_batch_num ON public.inventory_batches (pharmacy_id, batch_number);

-- 6. Inventory transactions performance index
CREATE INDEX IF NOT EXISTS idx_inventory_tx_pharmacy_id ON public.inventory_transactions (pharmacy_id);
