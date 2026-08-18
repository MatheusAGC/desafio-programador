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

export async function garantirTabela() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transcricoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processando',
      resultado JSONB,
      criado_em TIMESTAMP NOT NULL DEFAULT now(),
      caminho_arquivo TEXT
    );
  `);
}

export default pool;