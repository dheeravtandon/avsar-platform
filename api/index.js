import { createApp } from '../server/src/app.js';
import { get } from '../server/src/db/index.js';

/**
 * Vercel serverless entry point.
 *
 * Vercel's filesystem is read-only outside /tmp, and /tmp does not persist
 * between cold starts. server/src/config.js already points DB_FILE at
 * /tmp/avsar.db when process.env.VERCEL is set, so every cold start begins
 * with an empty database - which this file detects and reseeds from the same
 * deterministic demo dataset used locally (server/src/db/seed.js), so a live
 * demo always opens on a complete, coherent lifecycle rather than a blank one.
 *
 * Named api/index.js rather than a bracket catch-all: routing here relies on
 * the explicit rewrite in vercel.json ("/api/(.*)" -> "/api"), which is the
 * documented, battle-tested pattern for a plain Express app on Vercel. A
 * filesystem catch-all (api/[...path].js) turned out NOT to route requests
 * with more than one path segment on a project with framework: null - single
 * segment paths like /api/health worked, but /api/auth/login and
 * /api/dashboard/public hit Vercel's own 404 before ever reaching the
 * function. A rewrite preserves the original request path, so Express still
 * sees the full URL (e.g. /api/auth/login) via req.url and its own route
 * table continues to work unchanged.
 *
 * The Express app is exported (indirectly, via this handler) rather than
 * having its own .listen(): an Express app is itself callable as (req, res),
 * which is exactly the handler signature Vercel's Node runtime expects.
 */

let appPromise = null;

async function bootstrap() {
  const app = createApp(); // synchronous: applies the schema via migrate()

  const row = get('SELECT COUNT(*) AS c FROM users');
  if (!row || row.c === 0) {
    await import('../server/src/db/seed.js');
  }

  return app;
}

export default async function handler(req, res) {
  if (!appPromise) {
    // Retry on the next request rather than caching a permanent failure.
    appPromise = bootstrap().catch((err) => {
      appPromise = null;
      throw err;
    });
  }
  const app = await appPromise;
  return app(req, res);
}
