import { ZodError } from 'zod';
import { config } from '../config.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Endpoint not found' });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed',
      fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const status = err.status || 500;
  if (status >= 500) console.error('[avsar]', err);
  return res.status(status).json({
    error: err.expose === false || status >= 500 ? 'Internal server error' : err.message,
    ...(config.env === 'development' && status >= 500 ? { detail: err.message } : {}),
  });
}

/** Wrap an async handler so a rejected promise reaches errorHandler. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
