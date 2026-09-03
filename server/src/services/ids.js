import { get } from '../db/index.js';

const PREFIX = {
  challenges: 'CH',
  applications: 'AP',
  pilots: 'PL',
  procurements: 'PR',
  catalogue: 'CT',
  grievances: 'GR',
};

/**
 * File-number style identifiers a government user can quote on paper:
 *   AVS/CH/2026/0001
 * Sequence is per table, per calendar year.
 */
export function nextCode(table, year = new Date().getFullYear()) {
  const p = PREFIX[table];
  if (!p) throw new Error(`No code prefix registered for table "${table}"`);
  const like = `AVS/${p}/${year}/%`;
  const row = get(`SELECT code FROM ${table} WHERE code LIKE ? ORDER BY id DESC LIMIT 1`, [like]);
  const last = row ? Number(String(row.code).split('/').pop()) : 0;
  return `AVS/${p}/${year}/${String(last + 1).padStart(4, '0')}`;
}
