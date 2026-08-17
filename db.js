import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    user: 'quickfiller',
    password: 'quickfiller123',
    host: 'localhost',
    port: 5432,
    database: 'quickfiller',
});

export default pool;