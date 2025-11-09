import pool from './db.js';
import type { QueryResult } from 'pg';

/**
 * Subscription record shape (matches `subscriptions` table)
 */
export interface Subscription {
  id: number;
  phone_number: string;
  station_code: string;
  destination: string;
  // Stored as SQL TIME (HH:MM:SS)
  notify_at: string;
  created_at: string; // timestamptz in ISO format
}

/**
 * Insert a new subscription.
 * @param data Object with phone_number, station_code, destination, notify_at (time string, e.g. "15:30" or "15:30:00")
 */
export async function createSubscription(data: {
  phone_number: string;
  station_code: string;
  destination: string;
  notify_at: string;
}): Promise<Subscription> {
  const { phone_number, station_code, destination, notify_at } = data;
  const sql = `INSERT INTO subscriptions (phone_number, station_code, destination, notify_at)
    VALUES ($1, $2, $3, $4::time)
    RETURNING id, phone_number, station_code, destination, notify_at, created_at`;

  const result: QueryResult<Subscription> = await pool.query(sql, [phone_number, station_code, destination, notify_at]);
  return result.rows[0];
}

/**
 * Update an existing subscription by id. Returns the updated row or null if not found.
 */
export async function updateSubscription(id: number, updates: Partial<{
  phone_number: string;
  station_code: string;
  destination: string;
  notify_at: string;
}>): Promise<Subscription | null> {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.phone_number !== undefined) {
    sets.push(`phone_number = $${idx++}`);
    values.push(updates.phone_number);
  }
  if (updates.station_code !== undefined) {
    sets.push(`station_code = $${idx++}`);
    values.push(updates.station_code);
  }
  if (updates.destination !== undefined) {
    sets.push(`destination = $${idx++}`);
    values.push(updates.destination);
  }
  if (updates.notify_at !== undefined) {
    sets.push(`notify_at = $${idx++}::time`);
    values.push(updates.notify_at);
  }

  if (sets.length === 0) return null;

  values.push(id);
  const sql = `UPDATE subscriptions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, phone_number, station_code, destination, notify_at, created_at`;
  const result: QueryResult<Subscription> = await pool.query(sql, values);
  if (result.rowCount === 0) return null;
  return result.rows[0];
}

/**
 * Delete a subscription by id. Returns true if deleted, false if not found.
 */
export async function deleteSubscription(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get a subscription by id, or null if not found.
 */
export async function getSubscription(id: number): Promise<Subscription | null> {
  const result: QueryResult<Subscription> = await pool.query('SELECT id, phone_number, station_code, destination, notify_at, created_at FROM subscriptions WHERE id = $1', [id]);
  if (result.rowCount === 0) return null;
  return result.rows[0];
}

/**
 * List subscriptions with an optional limit/offset.
 */
export async function listSubscriptions(limit = 100, offset = 0): Promise<Subscription[]> {
  const result: QueryResult<Subscription> = await pool.query('SELECT id, phone_number, station_code, destination, notify_at, created_at FROM subscriptions ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]);
  return result.rows;
}

/**
 * Get subscriptions due at the current time (rounded to the minute).
 * If `timeStr` is provided it should be a SQL time string (e.g. '15:30' or '15:30:00') and will be used instead of now().
 */
export async function getDueSubscriptions(timeStr?: string): Promise<Subscription[]> {
  if (timeStr) {
    const result: QueryResult<Subscription> = await pool.query('SELECT id, phone_number, station_code, destination, notify_at, created_at FROM subscriptions WHERE notify_at = $1::time ORDER BY notify_at', [timeStr]);
    return result.rows;
  }

  const result: QueryResult<Subscription> = await pool.query("SELECT id, phone_number, station_code, destination, notify_at, created_at FROM subscriptions WHERE notify_at = date_trunc('minute', now())::time ORDER BY notify_at");
  return result.rows;
}

export default {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  getDueSubscriptions,
};
