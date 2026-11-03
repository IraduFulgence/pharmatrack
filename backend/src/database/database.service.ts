import 'dotenv/config';
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import pg from 'pg';
import type { PoolClient, QueryResult } from 'pg';

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'pharmatrack_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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
      // 1. Patients auth updates and date of birth
      await this.pool.query(`
        ALTER TABLE public.patients 
          ADD COLUMN IF NOT EXISTS date_of_birth DATE,
          ADD COLUMN IF NOT EXISTS password_hash TEXT,
          ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
      `);

      // 2. Pharmacies auth and registration field updates
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

      // 3. Password resets table
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

      this.logger.log('Database schema verification and migrations verified successfully.');
    } catch (error: any) {
      this.logger.error(`Error running database migrations: ${error.message}`);
    }
  }
}
