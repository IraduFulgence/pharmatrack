-- Migration 006: System Improvements
-- 1. Locations for pharmacies
-- 2. Purchase and Selling prices for inventory_batches
-- 3. Product packaging management table
-- 4. Pharmacy patients association table
-- 5. Optional insurance card numbers
-- 6. Packaging info in sale items

-- 1. Ensure location_address, latitude, longitude columns on pharmacies
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

-- 2. Extend inventory_batches with purchase_price and selling_price
ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2);
ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2);

-- Migrate existing unit_price values safely
UPDATE public.inventory_batches
SET purchase_price = unit_price
WHERE purchase_price IS NULL AND unit_price IS NOT NULL;

UPDATE public.inventory_batches
SET selling_price = unit_price
WHERE selling_price IS NULL AND unit_price IS NOT NULL;

-- 3. Product Packaging Management Table
CREATE TABLE IF NOT EXISTS public.medicine_packaging (
  packaging_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  medicine_id BIGINT NOT NULL REFERENCES public.medicines(medicine_id) ON DELETE CASCADE,
  package_name VARCHAR(100) NOT NULL,
  package_unit VARCHAR(50) NOT NULL,
  units_per_package INTEGER NOT NULL CHECK (units_per_package > 0),
  price_per_package NUMERIC(12, 2),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_medicine_packaging UNIQUE (medicine_id, package_name)
);

CREATE INDEX IF NOT EXISTS idx_medicine_packaging_med_id ON public.medicine_packaging (medicine_id);

-- 4. Pharmacy-Specific Patients Association Table
CREATE TABLE IF NOT EXISTS public.pharmacy_patients (
  pharmacy_patient_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  registered_by BIGINT REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_pharmacy_patient UNIQUE (pharmacy_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_patients_pharmacy ON public.pharmacy_patients (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_patients_patient ON public.pharmacy_patients (patient_id);

-- Backfill pharmacy_patients from existing sales
INSERT INTO public.pharmacy_patients (pharmacy_id, patient_id)
SELECT DISTINCT pharmacy_id, patient_id
FROM public.sales
WHERE patient_id IS NOT NULL
ON CONFLICT (pharmacy_id, patient_id) DO NOTHING;

-- 5. Optional Insurance Card Number in patient_insurances and insurance_claims
ALTER TABLE public.patient_insurances ALTER COLUMN card_number DROP NOT NULL;
ALTER TABLE public.insurance_claims ALTER COLUMN insurance_card_number DROP NOT NULL;

-- 6. Add packaging details to sale_items
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS packaging_name VARCHAR(100);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS package_quantity INTEGER;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS units_per_package INTEGER DEFAULT 1;

