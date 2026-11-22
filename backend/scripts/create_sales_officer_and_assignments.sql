-- Migration: create sales_officers and pharmacy_assignments tables
-- ------------------------------------------------------------
-- sales_officers stores sales officer users and the pharmacy they belong to.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_officers (
  sales_officer_id SERIAL PRIMARY KEY,
  pharmacy_id INT NOT NULL REFERENCES public.pharmacies (pharmacy_id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50)
);

-- pharmacy_assignments stores generic tasks/assignments given by a pharmacy admin to staff.
CREATE TABLE IF NOT EXISTS public.pharmacy_assignments (
  assignment_id SERIAL PRIMARY KEY,
  pharmacy_id INT NOT NULL REFERENCES public.pharmacies (pharmacy_id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
