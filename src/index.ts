import http from 'node:http';
import pool from './db.js';
import { MetroAPI } from './metro.js';
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
} from './subscription.js';
import { startWorker, stopWorker } from './worker.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

function sendJSON(res: http.ServerResponse, status: number, obj: unknown) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body).toString(),
  });
  res.end(body);
}

// Create server with a /health endpoint that checks DB connectivity
const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  if (url === '/health' && req.method === 'GET') {
    try {
      await pool.query('SELECT 1');
      sendJSON(res, 200, { status: 'ok', db: 'ok' });
    } catch (err) {
      sendJSON(res, 503, { status: 'error', db: 'down', error: (err instanceof Error ? err.message : String(err)) });
    }
    return;
  }

  // GET /predictions?station=B03 or /predictions?station=B03,B04
  if (url.startsWith('/predictions') && req.method === 'GET') {
    try {
      const u = new URL(req.url || '', `http://localhost:${PORT}`);
      const station = u.searchParams.get('station');
      if (!station) {
        sendJSON(res, 400, { error: 'station query parameter is required, e.g. ?station=B03' });
        return;
      }

      const apiKey = process.env.WMATA_API_KEY;
      if (!apiKey) {
        sendJSON(res, 500, { error: 'WMATA_API_KEY not configured' });
        return;
      }

      const metro = new MetroAPI(apiKey);
      const predictions = await metro.getPredictions(station);
      sendJSON(res, 200, { station, predictions });
    } catch (err) {
      sendJSON(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  // /subscription POST
  if (url === '/subscription' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { phone_number, station_code, destination, notify_at } = body || {};
      if (!phone_number || !station_code || !destination || !notify_at) {
        sendJSON(res, 400, { error: 'phone_number, station_code, destination and notify_at are required' });
        return;
      }

      const subscription = await createSubscription({ phone_number, station_code, destination, notify_at });
      sendJSON(res, 201, { subscription });
    } catch (err) {
      sendJSON(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  // /subscription PUT
  if (url === '/subscription' && req.method === 'PUT') {
    try {
      const body = await readJsonBody(req);
      const { id, phone_number, station_code, destination, notify_at } = body || {};
      if (!id) {
        sendJSON(res, 400, { error: 'id is required for update' });
        return;
      }

      const updated = await updateSubscription(Number(id), { phone_number, station_code, destination, notify_at });
      if (!updated) {
        sendJSON(res, 404, { error: 'subscription not found or no fields to update' });
        return;
      }
      sendJSON(res, 200, { subscription: updated });
    } catch (err) {
      sendJSON(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  // /subscription DELETE
  if (url.startsWith('/subscription') && req.method === 'DELETE') {
    try {
      const u = new URL(req.url || '', `http://localhost:${PORT}`);
      const idParam = u.searchParams.get('id');
      if (!idParam) {
        sendJSON(res, 400, { error: 'id query parameter is required, e.g. /subscription?id=123' });
        return;
      }
      const deleted = await deleteSubscription(Number(idParam));
      if (!deleted) {
        sendJSON(res, 404, { error: 'subscription not found' });
        return;
      }
      sendJSON(res, 200, { deleted: true });
    } catch (err) {
      sendJSON(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  // /subscriptions GET - list all subscriptions
  if (url === '/subscriptions' && req.method === 'GET') {
    try {
      const subscriptions = await listSubscriptions();
      sendJSON(res, 200, { subscriptions });
    } catch (err) {
      sendJSON(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  // Not found
  sendJSON(res, 404, { error: 'Not Found' });
});

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Start server when this module is executed directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    try {
      startWorker();
    } catch (err) {
      console.error('Failed to start worker', err instanceof Error ? err.message : err);
    }
  });
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing server and DB pool...`);
  server.close(async (err) => {
    if (err) console.error('Error closing server', err);
    try {
      // stop worker then close DB pool
      try {
        stopWorker();
      } catch (e) {
        console.error('Error stopping worker', e);
      }
      await pool.end();
      console.log('DB pool closed');
    } catch (e) {
      console.error('Error closing DB pool', e);
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));