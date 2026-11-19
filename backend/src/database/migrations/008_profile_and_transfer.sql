-- Migration 008: Profile Management, Employee Transfer, Insurance Configuration, and Activity Logs

-- 1. pharmacy_insurances table
CREATE TABLE IF NOT EXISTS public.pharmacy_insurances (
  pharmacy_insurance_id BIGSERIAL PRIMARY KEY,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE CASCADE,
  insurance_id BIGINT NOT NULL REFERENCES public.insurance_providers(insurance_id) ON DELETE RESTRICT,
  coverage_percentage NUMERIC(5,2) NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (pharmacy_id, insurance_id)
);

-- 2. pharmacy_user_transfers table
CREATE TABLE IF NOT EXISTS public.pharmacy_user_transfers (
  transfer_id BIGSERIAL PRIMARY KEY,
  pharmacy_user_id BIGINT NOT NULL REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE CASCADE,
  from_pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE RESTRICT,
  to_pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE RESTRICT,
  requested_by BIGINT NOT NULL REFERENCES public.admins(admin_id) ON DELETE RESTRICT,
  approved_by BIGINT NULL REFERENCES public.admins(admin_id) ON DELETE RESTRICT,
  transfer_reason TEXT NOT NULL,
  transfer_status VARCHAR(20) NOT NULL CHECK (transfer_status IN ('PENDING','APPROVED','REJECTED')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE (pharmacy_user_id, from_pharmacy_id, to_pharmacy_id, transfer_status)
);

-- 3. pharmacy_user_assignments table (historical assignments)
CREATE TABLE IF NOT EXISTS public.pharmacy_user_assignments (
  assignment_id BIGSERIAL PRIMARY KEY,
  pharmacy_user_id BIGINT NOT NULL REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE CASCADE,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE RESTRICT,
  role VARCHAR(30) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NULL,
  is_current BOOLEAN DEFAULT TRUE NOT NULL,
  UNIQUE (pharmacy_user_id, pharmacy_id, is_current)
);

-- 4. patient_activity_logs table (if not exists)
CREATE TABLE IF NOT EXISTS public.patient_activity_logs (
  log_id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_pharmacy_insurances_pharmacy ON public.pharmacy_insurances (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_user_transfers_status ON public.pharmacy_user_transfers (transfer_status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_user_assignments_current ON public.pharmacy_user_assignments (pharmacy_user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_patient_activity_logs_patient ON public.patient_activity_logs (patient_id);
