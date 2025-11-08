/**
 * Example TypeScript Node.js application entry point
 */

export function greet(name: string): string {
  return `Hello, ${name}!`;
}

import http from 'node:http';
import pool from './db.js';
import { MetroAPI } from './metro.js';

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

  if (url === '/' && req.method === 'GET') {
    sendJSON(res, 200, { message: greet('world') });
    return;
  }

  // Not found
  sendJSON(res, 404, { error: 'Not Found' });
});

// Start server when this module is executed directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing server and DB pool...`);
  server.close(async (err) => {
    if (err) console.error('Error closing server', err);
    try {
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