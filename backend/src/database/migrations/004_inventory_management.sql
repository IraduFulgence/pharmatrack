-- Migration 004: Inventory Management Schema
-- Adds reorder_level, status to inventory_batches, creates inventory_transactions table, and adds performance indexes

-- 1. Extend inventory_batches
ALTER TABLE public.inventory_batches 
  ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10 NOT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL;

-- 2. Create inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES public.inventory_batches(inventory_id) ON DELETE CASCADE,
  pharmacy_id BIGINT NOT NULL REFERENCES public.pharmacies(pharmacy_id) ON DELETE CASCADE,
  pharmacy_user_id BIGINT REFERENCES public.pharmacy_users(pharmacy_user_id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_inventory_batches_pharmacy ON public.inventory_batches (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_pharm_med ON public.inventory_batches (pharmacy_id, medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON public.inventory_batches (pharmacy_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_batch_num ON public.inventory_batches (batch_number);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_inventory_id ON public.inventory_transactions (inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_pharmacy_id ON public.inventory_transactions (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_created_at ON public.inventory_transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_type ON public.inventory_transactions (transaction_type);

-- 4. Seed initial standard medicines catalogue if empty
INSERT INTO public.medicines (medicine_name, generic_name, brand_name, strength, dosage_form, description, requires_prescription)
SELECT m.medicine_name, m.generic_name, m.brand_name, m.strength, m.dosage_form, m.description, m.requires_prescription
FROM (VALUES
  ('Paracetamol 500mg Tablets', 'Paracetamol', 'Panadol', '500mg', 'Tablet', 'Analgesic and antipyretic for mild to moderate pain and fever.', false),
  ('Amoxicillin 500mg Capsules', 'Amoxicillin', 'Amoxil', '500mg', 'Capsule', 'Broad-spectrum penicillin antibiotic for bacterial infections.', true),
  ('Ibuprofen 400mg Tablets', 'Ibuprofen', 'Brufen', '400mg', 'Tablet', 'Non-steroidal anti-inflammatory drug (NSAID) for pain and inflammation.', false),
  ('Metformin 500mg Tablets', 'Metformin HCl', 'Glucophage', '500mg', 'Tablet', 'Oral antihyperglycemic agent for Type 2 Diabetes.', true),
  ('Omeprazole 20mg Capsules', 'Omeprazole', 'Losec', '20mg', 'Capsule', 'Proton pump inhibitor for acid reflux, GERD, and ulcers.', false),
  ('Ciprofloxacin 500mg Tablets', 'Ciprofloxacin', 'Cipro', '500mg', 'Tablet', 'Fluoroquinolone antibiotic for serious bacterial infections.', true),
  ('Cetirizine 10mg Tablets', 'Cetirizine HCl', 'Zyrtec', '10mg', 'Tablet', 'Second-generation antihistamine for allergic rhinitis and urticaria.', false),
  ('Azithromycin 500mg Tablets', 'Azithromycin', 'Zithromax', '500mg', 'Tablet', 'Macrolide antibiotic for respiratory and skin infections.', true),
  ('Amlodipine 5mg Tablets', 'Amlodipine Besylate', 'Norvasc', '5mg', 'Tablet', 'Calcium channel blocker for hypertension and angina.', true),
  ('Atorvastatin 20mg Tablets', 'Atorvastatin Calcium', 'Lipitor', '20mg', 'Tablet', 'Statin HMG-CoA reductase inhibitor for hypercholesterolemia.', true),
  ('Losartan 50mg Tablets', 'Losartan Potassium', 'Cozaar', '50mg', 'Tablet', 'Angiotensin II receptor blocker (ARB) for hypertension.', true),
  ('Salbutamol 100mcg Inhaler', 'Salbutamol / Albuterol', 'Ventolin', '100mcg/dose', 'Inhaler', 'Short-acting beta-2 agonist bronchodilator for asthma and COPD.', true),
  ('Artemether / Lumefantrine Tablets', 'Artemether + Lumefantrine', 'Coartem', '20/120mg', 'Tablet', 'First-line ACT antimalarial for uncomplicated Plasmodium falciparum malaria.', true),
  ('Oral Rehydration Salts (ORS)', 'Oral Rehydration Salts', 'Electral', '20.5g sachet', 'Powder for Solution', 'WHO formulation oral rehydration therapy for dehydration.', false),
  ('Diclofenac Sodium 50mg Tablets', 'Diclofenac Sodium', 'Voltaren', '50mg', 'Tablet', 'NSAID for joint pain, arthritis, and acute musculoskeletal pain.', true)
) AS m(medicine_name, generic_name, brand_name, strength, dosage_form, description, requires_prescription)
WHERE NOT EXISTS (SELECT 1 FROM public.medicines LIMIT 1);

