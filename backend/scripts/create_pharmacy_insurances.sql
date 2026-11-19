-- Migration: create pharmacy_insurances table
-- ------------------------------------------------------------
-- This table stores the relationship between a pharmacy and the insurance
-- providers it accepts, together with the coverage percentage negotiated.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pharmacy_insurances (
  pharmacy_insurance_id SERIAL PRIMARY KEY,
  pharmacy_id          INT NOT NULL REFERENCES public.pharmacies (pharmacy_id) ON DELETE CASCADE,
  insurance_id         INT NOT NULL REFERENCES public.insurance_providers (insurance_id) ON DELETE RESTRICT,
  coverage_percentage  NUMERIC(5,2) NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
