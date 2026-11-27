-- Migration 007: Staff Management, RBAC Roles, and Activity Logs
-- 1. Updates to pharmacy_users: created_by, updated_at, last_login_at, phone_number, allow null password/email for invitations
-- 2. Updates to password_resets: purpose ('ACCOUNT_ACTIVATION' or 'PASSWORD_RESET'), code for admin/SMS issuance
-- 3. Updates to pharmacies: ensure primary owner in pharmacy_users is mapped as PHARMACY_ADMIN
-- 4. Create pharmacy_user_activity_logs table for staff activity tracking

-- 1. pharmacy_users updates
ALTER TABLE public.pharmacy_users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(25);
ALTER TABLE public.pharmacy_users ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE public.pharmacy_users DROP CONSTRAINT IF EXISTS pharmacy_users_created_by_fkey;
ALTER TABLE public.pharmacy_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;
ALTER TABLE public.pharmacy_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Allow email and password_hash to be nullable during initial invitation
ALTER TABLE public.pharmacy_users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.pharmacy_users ALTER COLUMN password_hash DROP NOT NULL;

-- Drop old check constraint on role to allow new RBAC roles
ALTER TABLE public.pharmacy_users DROP CONSTRAINT IF EXISTS pharmacy_users_role_check;
ALTER TABLE public.pharmacy_users ADD CONSTRAINT pharmacy_users_role_check 
  CHECK (role IN ('PHARMACY_ADMIN', 'PHARMACIST', 'SALES_OFFICER', 'OWNER', 'CASHIER', 'PHARMACY'));

-- Migrate any legacy OWNER or PHARMACY roles to PHARMACY_ADMIN
UPDATE public.pharmacy_users 
SET role = 'PHARMACY_ADMIN' 
WHERE role = 'OWNER' OR role = 'PHARMACY';

-- 2. password_resets updates
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS purpose VARCHAR(30) DEFAULT 'PASSWORD_RESET' NOT NULL;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS code VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_password_resets_code ON public.password_resets (code);
CREATE INDEX IF NOT EXISTS idx_password_resets_purpose ON public.password_resets (purpose);

-- 3. Create pharmacy_user_activity_logs table
CREATE TABLE IF NOT EXISTS public.pharmacy_user_activity_logs (
  log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE CASCADE,
  pharmacy_user_id BIGINT REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id BIGINT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_activity_logs_pharmacy ON public.pharmacy_user_activity_logs (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_activity_logs_user ON public.pharmacy_user_activity_logs (pharmacy_user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_activity_logs_action ON public.pharmacy_user_activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_pharmacy_activity_logs_created_at ON public.pharmacy_user_activity_logs (created_at);
