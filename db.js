import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'quickfiller',
  password: 'quickfiller123',
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'quickfiller',
});

export default pool;