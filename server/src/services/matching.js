/**
 * Discovery / match engine.
 *
 * Deliberately a transparent, explainable weighted model rather than an opaque
 * embedding score: a department must be able to justify a shortlist in an audit,
 * so every point awarded carries a human-readable reason.
 */

const WEIGHTS = {
  sector: 30,
  capability: 30,
  trl: 20,
  track: 10,
  geography: 10,
};

const parse = (v, fallback = []) => {
  try {
    const out = JSON.parse(v ?? '[]');
    return Array.isArray(out) ? out : fallback;
  } catch {
    return fallback;
  }
};

const norm = (s) => String(s || '').toLowerCase().trim();

export function scoreMatch(startup, challenge) {
  const reasons = [];
  let score = 0;

  // 1. Sector alignment
  if (norm(startup.sector) === norm(challenge.sector)) {
    score += WEIGHTS.sector;
    reasons.push({ factor: 'Sector', points: WEIGHTS.sector, note: `Exact sector match (${challenge.sector})` });
  } else if (norm(startup.sub_sector) && norm(challenge.sector).includes(norm(startup.sub_sector))) {
    score += WEIGHTS.sector / 2;
    reasons.push({ factor: 'Sector', points: WEIGHTS.sector / 2, note: 'Adjacent sector' });
  } else {
    reasons.push({ factor: 'Sector', points: 0, note: 'Different sector' });
  }

  // 2. Capability tag overlap against challenge tags
  const caps = parse(startup.capabilities).map(norm);
  const tags = parse(challenge.tags).map(norm);
  const hits = tags.filter((t) => caps.includes(t));
  const capPoints = tags.length ? Math.round((hits.length / tags.length) * WEIGHTS.capability) : 0;
  score += capPoints;
  reasons.push({
    factor: 'Capability',
    points: capPoints,
    note: hits.length ? `Matched ${hits.length}/${tags.length} required capabilities: ${hits.join(', ')}` : 'No capability tag overlap',
  });

  // 3. Technology readiness against the floor the department set
  const trlGap = Number(startup.trl) - Number(challenge.trl_min);
  const trlPoints = trlGap >= 0 ? Math.min(WEIGHTS.trl, WEIGHTS.trl - trlGap * 2) : 0;
  score += Math.max(0, trlPoints);
  reasons.push({
    factor: 'Readiness',
    points: Math.max(0, trlPoints),
    note: trlGap >= 0 ? `TRL ${startup.trl} meets floor of ${challenge.trl_min}` : `TRL ${startup.trl} below floor of ${challenge.trl_min}`,
  });

  // 4. Prior public-sector delivery (a signal, never a gate - GFR 2017 R.173(i))
  if (Number(startup.has_prior_govt_order) === 1) {
    score += WEIGHTS.track;
    reasons.push({ factor: 'Track record', points: WEIGHTS.track, note: 'Has delivered a prior government order' });
  } else {
    reasons.push({ factor: 'Track record', points: 0, note: 'First-time government supplier (not a disqualifier)' });
  }

  // 5. Geography - same state as a state/ULB department
  if (challenge.level !== 'CENTRAL' && norm(startup.state) === norm(challenge.state)) {
    score += WEIGHTS.geography;
    reasons.push({ factor: 'Geography', points: WEIGHTS.geography, note: `Located in ${startup.state}` });
  } else {
    score += WEIGHTS.geography / 2;
    reasons.push({ factor: 'Geography', points: WEIGHTS.geography / 2, note: 'Pan-India delivery assumed' });
  }

  return { score: Math.round(Math.min(100, score)), reasons };
}

export function rankStartups(startups, challenge, limit = 10) {
  return startups
    .map((s) => ({ startup: s, ...scoreMatch(s, challenge) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const MATCH_WEIGHTS = WEIGHTS;
