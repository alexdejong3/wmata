import dotenv from 'dotenv';
import { Pool } from 'pg';
import { SSMUtils } from './ssm.js';

dotenv.config();

const ssm = new SSMUtils();

const pool = new Pool({
  host: process.env.PGHOST || await ssm.getParameter('/database/host'),
  port: process.env.PGPORT ? Number(process.env.PGPORT) : Number(await ssm.getParameter('/database/port')),
  user: process.env.PGUSER || await ssm.getParameter('/database/user'),
  password: process.env.PGPASSWORD || await ssm.getParameter('/database/password'),
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

export default pool;

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
