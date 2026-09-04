import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const port = 4124;
const base = `http://localhost:${port}/api`;
const dbFile = path.join(serverDir, 'data', `automated-evaluation-${process.pid}.db`);
const env = {
  ...process.env,
  API_PORT: String(port),
  DB_FILE: dbFile,
  NODE_ENV: 'test',
  JWT_SECRET: 'automated-evaluation-test-secret',
};

async function call(method, url, { body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, body: payload };
}

async function waitForApi() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('API did not start in time');
}

let server;
try {
  const seeded = spawnSync(process.execPath, ['src/db/seed.js'], { cwd: serverDir, env, stdio: 'inherit' });
  assert.equal(seeded.status, 0, 'demo seed failed');

  server = spawn(process.execPath, ['src/index.js'], { cwd: serverDir, env, stdio: 'ignore' });
  await waitForApi();

  const login = await call('POST', '/auth/login', {
    body: { email: 'eval.rehana@avsar.gov.in', password: 'Avsar@2026' },
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const token = login.body.token;

  const worklist = await call('GET', '/evaluations/mine', { token });
  assert.equal(worklist.status, 200);
  const pending = worklist.body.find((row) => row.status === 'ASSIGNED');
  assert.ok(pending, 'seed data should contain a pending evaluator assignment');

  const withoutCoi = await call('POST', `/evaluations/${pending.id}/auto-score`, {
    token,
    body: { coiDeclared: false },
  });
  assert.equal(withoutCoi.status, 400);

  const evaluated = await call('POST', `/evaluations/${pending.id}/auto-score`, {
    token,
    body: { coiDeclared: true },
  });
  assert.equal(evaluated.status, 200, JSON.stringify(evaluated.body));
  assert.equal(evaluated.body.result.algorithmVersion, '1.0.0');
  assert.ok(evaluated.body.result.scores.finalScore >= 0 && evaluated.body.result.scores.finalScore <= 100);
  assert.ok(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(evaluated.body.result.riskLevel));
  assert.ok(evaluated.body.inputBasis.limitations.length >= 1);

  const refreshed = await call('GET', '/evaluations/mine', { token });
  const stored = refreshed.body.find((row) => row.id === pending.id);
  assert.equal(stored.status, 'SUBMITTED');
  assert.equal(stored.scores.evaluationMode, 'AUTOMATED');
  assert.equal(stored.total_score, evaluated.body.result.scores.finalScore);

  const locked = await call('POST', `/evaluations/${pending.id}/auto-score`, {
    token,
    body: { coiDeclared: true },
  });
  assert.equal(locked.status, 409);

  console.log('Automated evaluation API: PASS');
} finally {
  if (server) server.kill();
  await new Promise((resolve) => setTimeout(resolve, 150));
  try { fs.rmSync(dbFile, { force: true }); } catch { /* Windows may briefly retain the handle */ }
}
