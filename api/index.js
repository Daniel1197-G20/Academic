import { initializeDatabase } from '../server/db.js';
import { handleApiRequest } from '../server/api.js';

let dbInitialized = false;

export default async function handler(req, res) {
  try {
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    // Ensure req.url reflects the actual requested path under /api
    const originalUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.url;
    if (originalUrl && originalUrl.startsWith('/api')) {
      req.url = originalUrl;
    }

    await handleApiRequest(req, res);
  } catch (err) {
    console.error('API Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
    }
  }
}
