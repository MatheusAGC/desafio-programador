import pg from 'pg';

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new pg.Pool({
      user: 'quickfiller',
      password: 'quickfiller123',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      database: 'quickfiller',
    });

export default pool;