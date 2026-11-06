-- Migration: Add auth fields and date_of_birth to patients and pharmacies

-- 1. Patients table updates
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- 2. Pharmacies table updates
-- Location is not collected during initial registration, so allow NULL until profile completion
ALTER TABLE public.pharmacies 
  ALTER COLUMN location_address DROP NOT NULL,
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Add password_hash column to pharmacies
ALTER TABLE public.pharmacies 
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Ensure phone_number is UNIQUE on pharmacies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pharmacies_phone_number_key'
  ) THEN
    ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;
