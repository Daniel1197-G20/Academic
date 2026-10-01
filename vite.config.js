import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { initializeDatabase } from './server/db.js';
import { handleApiRequest } from './server/api.js';

// Custom Vite plugin serving the real PostgreSQL API endpoints directly in dev
function academicApiPlugin() {
  return {
    name: 'academic-api-server',
    async configureServer(server) {
      await initializeDatabase();
      console.log('⚡ [DB] PostgreSQL persistent database initialized for dev server.');
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          await handleApiRequest(req, res);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), academicApiPlugin()],
  server: {
    port: 3000,
    host: true
  }
});
