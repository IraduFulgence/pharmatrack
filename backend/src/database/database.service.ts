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
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      max: Number(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: Number(process.env.DB_TIMEOUT) || 30000,
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
