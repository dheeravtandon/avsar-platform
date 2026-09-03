import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { migrate, dbFilePath, get } from './db/index.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import applicationRoutes from './routes/applications.js';
import evaluationRoutes from './routes/evaluations.js';
import pilotRoutes from './routes/pilots.js';
import procurementRoutes from './routes/procurement.js';
import catalogueRoutes from './routes/catalogue.js';
import dashboardRoutes from './routes/dashboard.js';
import registryRoutes from './routes/registry.js';
import metaRoutes from './routes/meta.js';
import miscRoutes from './routes/misc.js';

migrate();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(cors({ origin: config.clientOrigin.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Minimal request log - enough for a demo, structured enough to ship to a SIEM.
app.use((req, _res, next) => {
  if (config.env === 'development') console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (_req, res) => {
  const users = get('SELECT COUNT(*) AS c FROM users');
  res.json({
    status: 'ok',
    service: 'avsar-api',
    version: '1.0.0',
    env: config.env,
    database: { engine: 'sqlite (node:sqlite)', file: dbFilePath, seeded: (users?.c ?? 0) > 0 },
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/pilots', pilotRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/registry', registryRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api', miscRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`AVSAR API listening on http://localhost:${config.port}  [${config.env}]`);
  console.log(`Database: ${dbFilePath}`);
});
