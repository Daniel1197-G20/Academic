import http from 'http';
import { initializeDatabase } from './db.js';
import { handleApiRequest } from './api.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await initializeDatabase();
  console.log('Database initialized successfully with PostgreSQL WASM persistence.');

  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/api/')) {
      await handleApiRequest(req, res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`Academic Platform API Server running at http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down API server gracefully...`);
    server.close();
    try {
      const { closeDatabase } = await import('./db.js');
      await closeDatabase();
      console.log('Database connection closed cleanly.');
    } catch (e) {
      console.error('Error closing database:', e);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(err => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
