import dotenv from 'dotenv';
import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import pool from './db.js';
import { sendSms } from './twilio.js';

dotenv.config();

/**
 * Worker: runs every minute, finds subscriptions whose notify_at falls within the last minute
 * and sends an SMS, then advances notify_at by 1 day so the subscription recurs daily.
 */

async function processDueSubscriptions() {
  try {
    // Compare time-of-day (notify_at is a TIME column). Match subscriptions
    // where notify_at equals the current time rounded to the minute.
    const res = await pool.query(
      `SELECT id, phone_number, station_code, destination, notify_at
       FROM subscriptions
       WHERE notify_at = date_trunc('minute', now())::time
       ORDER BY notify_at`
    );

    if (res.rowCount === 0) {
      console.log('No due subscriptions at this time');
      return;
    }

    for (const row of res.rows) {
      try {
        const message = `Reminder: upcoming train to ${row.destination}`;
        await sendSms(row.phone_number, message);
        // For daily recurrence we keep the same notify_at (time-only), so no update needed.
        console.log(`Sent SMS for subscription ${row.id} to ${row.phone_number}`);
      } catch (err) {
        console.error('Failed to process subscription', row.id, err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error('Worker query failed', err instanceof Error ? err.message : err);
  }
}

let task: ScheduledTask | null = null;

/**
 * Start the cron worker. Returns the scheduled task so callers can stop it.
 */
export function startWorker(): ScheduledTask {
  if (task) return task;
  task = cron.schedule('* * * * *', () => {
    console.log('Worker tick', new Date().toISOString());
    void processDueSubscriptions();
  });
  console.log('Subscription worker scheduled');
  return task;
}

export function stopWorker() {
  if (!task) return;
  try {
    task.stop();
    task = null;
    console.log('Subscription worker stopped');
  } catch (err) {
    console.error('Failed to stop worker', err);
  }
}

// If executed directly, start the worker
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  startWorker();
}

export { processDueSubscriptions };
