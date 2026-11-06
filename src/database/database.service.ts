import 'dotenv/config';
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
      connectionTimeoutMillis: Number(process.env.DB_TIMEOUT) || 15000,
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
