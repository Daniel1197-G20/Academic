import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Load all .env variables (including non-VITE_ ones) into process.env
// so that server-side plugin code (server/api.js, etc.) can read them.
const env = loadEnv('development', process.cwd(), '');
Object.assign(process.env, env);

// Custom Vite plugin serving the real PostgreSQL API endpoints directly in dev.
// Server modules are dynamically imported inside configureServer so that
// PGlite (and its WASM runtime) is never evaluated during `vite build`.
function academicApiPlugin() {
  return {
    name: 'academic-api-server',
    async configureServer(server) {
      const { initializeDatabase } = await import('./server/db.js');
      const { handleApiRequest } = await import('./server/api.js');
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
