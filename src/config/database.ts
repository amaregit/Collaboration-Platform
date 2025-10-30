import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Log connection details for debugging (excluding password)
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const url = new URL(dbUrl);
  console.log(`Database connection: host=${url.hostname}, port=${url.port}, user=${url.username}, database=${url.pathname.slice(1)}`);
} else {
  console.error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;