import path from 'node:path';
import * as dotenvModule from 'dotenv';
const dotenv = (dotenvModule as any).default || dotenvModule;
if (dotenv && typeof dotenv.config === 'function') {
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import type { PoolClient, QueryResult } from 'pg';

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: pg.Pool;

  constructor() {
    const isSsl =
      process.env.DB_SSL === 'true' ||
      (process.env.DB_HOST &&
        process.env.DB_HOST !== 'localhost' &&
        process.env.DB_HOST !== '127.0.0.1');

    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'pharmatrack_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: Number(process.env.DB_TIMEOUT) || 15000,
      // Added the SSL configuration here:
      ssl: isSsl ? { rejectUnauthorized: false } : false,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const client = await this.pool.connect();
      this.logger.log('Successfully connected to PostgreSQL database.');
      client.release();
      await this.runMigrations();
    } catch (err: any) {
      this.logger.error(`Database connection error: ${err.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('PostgreSQL connection pool closed.');
  }

  async query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      // ============================================================
      // Migration 001: Patients auth updates and date of birth
      // ============================================================
      await this.pool.query(`
        ALTER TABLE public.patients 
          ADD COLUMN IF NOT EXISTS date_of_birth DATE,
          ADD COLUMN IF NOT EXISTS password_hash TEXT,
          ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
      `);

      // ============================================================
      // Migration 002: Pharmacies auth and registration field updates
      // ============================================================
      await this.pool.query(`
        ALTER TABLE public.pharmacies 
          ALTER COLUMN location_address DROP NOT NULL,
          ALTER COLUMN latitude DROP NOT NULL,
          ALTER COLUMN longitude DROP NOT NULL;
      `);

      await this.pool.query(`
        ALTER TABLE public.pharmacies 
          ADD COLUMN IF NOT EXISTS password_hash TEXT;
      `);

      await this.pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'pharmacies_phone_number_key'
          ) THEN
            ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_phone_number_key UNIQUE (phone_number);
          END IF;
        END $$;
      `);

      // ============================================================
      // Migration 002b: Password resets table
      // ============================================================
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS public.password_resets (
            reset_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            email character varying(255) NOT NULL,
            user_type character varying(20) NOT NULL,
            user_id bigint NOT NULL,
            token_hash text NOT NULL,
            expires_at timestamp with time zone NOT NULL,
            used boolean DEFAULT false NOT NULL,
            created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON public.password_resets (token_hash);
        CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets (email);
      `);

      // ============================================================
      // Migration 003: Make patient email and national_id nullable
      // ============================================================
      await this.pool.query(`
        ALTER TABLE public.patients ALTER COLUMN email DROP NOT NULL;
      `).catch(() => { /* already nullable */ });

      await this.pool.query(`
        ALTER TABLE public.patients ALTER COLUMN national_id DROP NOT NULL;
      `).catch(() => { /* already nullable */ });

      // ============================================================
      // Migration 004: Pharmacy extended fields (TIN, docs, verification)
      // ============================================================
      await this.pool.query(`
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS tin VARCHAR(9);
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS pharmacy_certificate_path TEXT;
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS rdb_certificate_path TEXT;
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL;
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS verified_by BIGINT;
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
      `);

      await this.pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'pharmacies_tin_key'
          ) THEN
            ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_tin_key UNIQUE (tin);
          END IF;
        END $$;
      `);

      // ============================================================
      // Migration 005: Admins table
      // ============================================================
      await this.pool.query(`
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
      `);

      // ============================================================
      // Migration 006: Admin activity logs
      // ============================================================
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
          log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          admin_id BIGINT NOT NULL,
          action VARCHAR(100) NOT NULL,
          target_type VARCHAR(50),
          target_id BIGINT,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `);

      // ============================================================
      // Migration 007: Inventory Management and Transactions
      // ============================================================
      await this.pool.query(`
        ALTER TABLE public.inventory_batches 
          ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10 NOT NULL,
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL;

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

        CREATE INDEX IF NOT EXISTS idx_inventory_batches_pharmacy ON public.inventory_batches (pharmacy_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_batches_pharm_med ON public.inventory_batches (pharmacy_id, medicine_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON public.inventory_batches (pharmacy_id, expiry_date);
        CREATE INDEX IF NOT EXISTS idx_inventory_batches_batch_num ON public.inventory_batches (batch_number);

        CREATE INDEX IF NOT EXISTS idx_inventory_tx_inventory_id ON public.inventory_transactions (inventory_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_tx_pharmacy_id ON public.inventory_transactions (pharmacy_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_tx_created_at ON public.inventory_transactions (created_at);
        CREATE INDEX IF NOT EXISTS idx_inventory_tx_type ON public.inventory_transactions (transaction_type);

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
      `);

      // ============================================================
      // Migration 008: Sales and Billing Management Schema
      // ============================================================
      await this.pool.query(`
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
      `);

      // ============================================================
      // Migration 006: System Improvements (Locations, Prices, Packaging, Pharmacy Patients)
      // ============================================================
      await this.pool.query(`
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS location_address TEXT;
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
        ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

        ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2);
        ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2);

        UPDATE public.inventory_batches
        SET purchase_price = unit_price
        WHERE purchase_price IS NULL AND unit_price IS NOT NULL;

        UPDATE public.inventory_batches
        SET selling_price = unit_price
        WHERE selling_price IS NULL AND unit_price IS NOT NULL;

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

        INSERT INTO public.pharmacy_patients (pharmacy_id, patient_id)
        SELECT DISTINCT pharmacy_id, patient_id
        FROM public.sales
        WHERE patient_id IS NOT NULL
        ON CONFLICT (pharmacy_id, patient_id) DO NOTHING;

        ALTER TABLE public.patient_insurances ALTER COLUMN card_number DROP NOT NULL;
        ALTER TABLE public.insurance_claims ALTER COLUMN insurance_card_number DROP NOT NULL;

        ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS packaging_name VARCHAR(100);
        ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS package_quantity INTEGER;
        ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS units_per_package INTEGER DEFAULT 1;
      `);

      // ============================================================
      // Seed: Initial admin account from env vars
      // ============================================================
      const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
      if (adminEmail && adminPassword) {
        const existing = await this.pool.query(
          'SELECT admin_id FROM public.admins WHERE LOWER(email) = $1 LIMIT 1',
          [adminEmail.toLowerCase()],
        );
        if (existing.rows.length === 0) {
          const hash = await bcrypt.hash(adminPassword, 10);
          await this.pool.query(
            `INSERT INTO public.admins (full_name, phone_number, email, password_hash, is_active, must_change_password, role)
             VALUES ($1, $2, $3, $4, true, true, 'ADMIN')`,
            ['System Administrator', '+250000000000', adminEmail, hash],
          );
          this.logger.log('Initial admin account seeded successfully.');
        }
      }

      this.logger.log('Database schema verification and migrations verified successfully.');
    } catch (error: any) {
      this.logger.error(`Error running database migrations: ${error.message}`);
    }
  }
}