import { all } from '../db/index.js';

/**
 * Two-envelope evaluation model.
 *   Technical bucket  - 70 marks
 *   Commercial bucket - 30 marks
 * Each criterion carries max_score and weight; the weighted sum is normalised to
 * its bucket cap so criteria can be re-tuned without changing the 70/30 split.
 */

export const BUCKET_CAP = { TECHNICAL: 70, COMMERCIAL: 30 };
export const QUALIFYING_TECHNICAL = 45; // out of 70 - below this, no commercial opening

export function criteria() {
  return all('SELECT * FROM evaluation_criteria ORDER BY bucket DESC, id ASC');
}

export function computeTotal(scores, criteriaList = criteria()) {
  const buckets = { TECHNICAL: { got: 0, max: 0 }, COMMERCIAL: { got: 0, max: 0 } };

  for (const c of criteriaList) {
    const raw = Number(scores?.[c.code] ?? 0);
    const clamped = Math.max(0, Math.min(c.max_score, raw));
    buckets[c.bucket].got += clamped * c.weight;
    buckets[c.bucket].max += c.max_score * c.weight;
  }

  const technical = buckets.TECHNICAL.max ? (buckets.TECHNICAL.got / buckets.TECHNICAL.max) * BUCKET_CAP.TECHNICAL : 0;
  const commercial = buckets.COMMERCIAL.max ? (buckets.COMMERCIAL.got / buckets.COMMERCIAL.max) * BUCKET_CAP.COMMERCIAL : 0;

  return {
    technical: round2(technical),
    commercial: round2(commercial),
    total: round2(technical + commercial),
    qualifiesTechnically: technical >= QUALIFYING_TECHNICAL,
  };
}

/** Consensus across the evaluation committee, with a dispersion flag. */
export function consensus(evaluations) {
  const submitted = evaluations.filter((e) => e.status === 'SUBMITTED');
  if (!submitted.length) return { count: 0, average: 0, spread: 0, flagged: false };
  const totals = submitted.map((e) => Number(e.total_score));
  const average = totals.reduce((a, b) => a + b, 0) / totals.length;
  const spread = Math.max(...totals) - Math.min(...totals);
  return {
    count: submitted.length,
    average: round2(average),
    spread: round2(spread),
    // A spread wider than 20 marks forces a committee reconciliation sitting
    flagged: spread > 20,
  };
}

const round2 = (n) => Math.round(n * 100) / 100;
