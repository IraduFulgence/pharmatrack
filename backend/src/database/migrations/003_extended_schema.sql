-- Migration 003: Extended Schema for Patient optional fields, Pharmacy TIN & Verification, Admins & Audit logs

-- 1. Patients: make email and national_id optional / nullable
ALTER TABLE public.patients ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN national_id DROP NOT NULL;

-- 2. Pharmacies: add TIN, document paths, and verification workflow columns
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS tin VARCHAR(9);
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS pharmacy_certificate_path TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS rdb_certificate_path TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS verified_by BIGINT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pharmacies_tin_key'
  ) THEN
    ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_tin_key UNIQUE (tin);
  END IF;
END $$;

-- 3. Administrators table
CREATE TABLE IF NOT EXISTS public.admins (
  admin_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(25) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  must_change_password BOOLEAN DEFAULT TRUE NOT NULL,
  role VARCHAR(20) DEFAULT 'ADMIN' NOT NULL,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT admins_email_key UNIQUE (email),
  CONSTRAINT admins_phone_number_key UNIQUE (phone_number)
);

-- 4. Admin activity logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id BIGINT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

