-- Migration 005: Sales and Billing Management Schema
-- Creates insurance_providers, patient_insurances, sales, sale_items, payments, and insurance_claims

-- 1. Insurance Providers
CREATE TABLE IF NOT EXISTS public.insurance_providers (
  provider_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider_name VARCHAR(150) NOT NULL UNIQUE,
  provider_code VARCHAR(50) NOT NULL UNIQUE,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  default_coverage_percentage NUMERIC(5,2) DEFAULT 75.00 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Patient Insurances (Registered patient insurance cards)
CREATE TABLE IF NOT EXISTS public.patient_insurances (
  patient_insurance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  provider_id BIGINT NOT NULL REFERENCES public.insurance_providers(provider_id) ON DELETE RESTRICT,
  card_number VARCHAR(100) NOT NULL,
  coverage_percentage NUMERIC(5,2) DEFAULT 75.00 NOT NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_patient_provider_card UNIQUE (patient_id, provider_id, card_number)
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
  sale_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE RESTRICT,
  pharmacy_user_id BIGINT REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE SET NULL,
  patient_id BIGINT REFERENCES public.patients(patient_id) ON DELETE SET NULL,
  prescription_id BIGINT REFERENCES public.prescriptions(prescription_id) ON DELETE SET NULL,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  customer_type VARCHAR(20) DEFAULT 'WALK_IN' NOT NULL,
  customer_name VARCHAR(150),
  customer_phone VARCHAR(50),
  payment_category VARCHAR(20) NOT NULL,
  provider_id BIGINT REFERENCES public.insurance_providers(provider_id) ON DELETE SET NULL,
  insurance_card_number VARCHAR(100),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  patient_contribution NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  insurance_contribution NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(20) DEFAULT 'PAID' NOT NULL,
  sale_status VARCHAR(20) DEFAULT 'COMPLETED' NOT NULL,
  cancellation_reason TEXT,
  cancelled_by BIGINT REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE SET NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
  sale_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES public.sales(sale_id) ON DELETE CASCADE,
  inventory_id BIGINT NOT NULL REFERENCES public.inventory_batches(inventory_id) ON DELETE RESTRICT,
  medicine_id BIGINT NOT NULL REFERENCES public.medicines(medicine_id) ON DELETE RESTRICT,
  batch_number VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(12,2) NOT NULL,
  is_insurance_covered BOOLEAN DEFAULT TRUE NOT NULL,
  coverage_percentage NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
  insurance_contribution NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
  patient_contribution NUMERIC(12,2) NOT NULL,
  returned_quantity INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES public.sales(sale_id) ON DELETE CASCADE,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(100),
  payer_type VARCHAR(20) NOT NULL,
  received_by BIGINT REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Insurance Claims Table
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  claim_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES public.sales(sale_id) ON DELETE CASCADE,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE RESTRICT,
  provider_id BIGINT NOT NULL REFERENCES public.insurance_providers(provider_id) ON DELETE RESTRICT,
  claim_number VARCHAR(100) NOT NULL UNIQUE,
  patient_id BIGINT REFERENCES public.patients(patient_id) ON DELETE SET NULL,
  insurance_card_number VARCHAR(100) NOT NULL,
  total_claimed_amount NUMERIC(12,2) NOT NULL,
  approved_amount NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
  claim_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
  rejection_reason TEXT,
  submission_date TIMESTAMP WITH TIME ZONE,
  settlement_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_id ON public.sales (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_sales_patient_id ON public.sales (patient_id);
CREATE INDEX IF NOT EXISTS idx_sales_receipt_num ON public.sales (receipt_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment_category ON public.sales (payment_category);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales (payment_status);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_medicine_id ON public.sale_items (medicine_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_inventory_id ON public.sale_items (inventory_id);

CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments (sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_pharmacy_id ON public.payments (pharmacy_id);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_pharmacy ON public.insurance_claims (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_provider ON public.insurance_claims (provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims (claim_status);

-- 8. Seed Standard Rwandan Insurance Providers if empty
INSERT INTO public.insurance_providers (provider_name, provider_code, default_coverage_percentage, contact_phone, contact_email)
SELECT p.provider_name, p.provider_code, p.default_coverage_percentage, p.contact_phone, p.contact_email
FROM (VALUES
  ('RSSB / RAMA', 'RSSB', 85.00, '+250252598400', 'info@rssb.rw'),
  ('MMI (Military Medical Insurance)', 'MMI', 85.00, '+250252585250', 'info@mmi.gov.rw'),
  ('Mutuelle de Santé (CBHI)', 'CBHI', 90.00, '+250252598400', 'cbhi@rssb.rw'),
  ('Radiant Insurance Company', 'RADIANT', 80.00, '+250788100100', 'info@radiant.rw'),
  ('Sanlam Vie & Assurance Rwanda', 'SANLAM', 80.00, '+250252575253', 'rwanda@sanlam.com'),
  ('Britam Insurance Rwanda', 'BRITAM', 75.00, '+250788383800', 'contact@britam.rw'),
  ('Prime Insurance Ltd', 'PRIME', 75.00, '+250788308444', 'info@prime.rw'),
  ('UAP Insurance Rwanda', 'UAP', 80.00, '+250252503504', 'uap@uap.co.rw')
) AS p(provider_name, provider_code, default_coverage_percentage, contact_phone, contact_email)
WHERE NOT EXISTS (SELECT 1 FROM public.insurance_providers LIMIT 1);

