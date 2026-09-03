/**
 * Canonical AVSAR lifecycle.
 *
 * The five stages the platform is named for:
 *   A - Assess    : department frames an outcome-based problem statement
 *   V - Validate  : eligibility gate + committee evaluation
 *   S - Sandbox   : funded, time-boxed, KPI-measured pilot
 *   A - Adopt     : procurement on the strength of pilot evidence
 *   R - Ramp-up   : rate contract + cross-department reuse
 *
 * Transitions are declared, not scattered through route handlers, so the legal
 * order of operations is one file a reviewer can read end to end.
 */

export const STAGES = [
  { key: 'ASSESS', letter: 'A', label: 'Assess', blurb: 'Problem statement framed and approved' },
  { key: 'VALIDATE', letter: 'V', label: 'Validate', blurb: 'Eligibility gate and committee evaluation' },
  { key: 'SANDBOX', letter: 'S', label: 'Sandbox', blurb: 'Funded pilot with measured KPIs' },
  { key: 'ADOPT', letter: 'A', label: 'Adopt', blurb: 'Procurement on pilot evidence' },
  { key: 'RAMPUP', letter: 'R', label: 'Ramp-up', blurb: 'Rate contract and cross-department reuse' },
];

export const CHALLENGE_FLOW = {
  DRAFT: ['PENDING_APPROVAL', 'ARCHIVED'],
  PENDING_APPROVAL: ['PUBLISHED', 'REJECTED', 'DRAFT'],
  PUBLISHED: ['CLOSED', 'ARCHIVED'],
  CLOSED: ['EVALUATION', 'ARCHIVED'],
  EVALUATION: ['PILOT', 'CLOSED', 'ARCHIVED'],
  PILOT: ['PROCURED', 'ARCHIVED'],
  PROCURED: ['ARCHIVED'],
  REJECTED: ['DRAFT'],
  ARCHIVED: [],
};

export const APPLICATION_FLOW = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['ELIGIBILITY_FAIL', 'UNDER_EVALUATION', 'WITHDRAWN'],
  ELIGIBILITY_FAIL: ['SUBMITTED'],
  UNDER_EVALUATION: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['SELECTED_FOR_PILOT', 'REJECTED'],
  SELECTED_FOR_PILOT: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export const PILOT_FLOW = {
  AGREEMENT_PENDING: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['ON_HOLD', 'UNDER_REVIEW'],
  ON_HOLD: ['ACTIVE', 'CLOSED'],
  UNDER_REVIEW: ['SUCCESS', 'PARTIAL', 'FAILED'],
  SUCCESS: ['CLOSED'],
  PARTIAL: ['ACTIVE', 'CLOSED'],
  FAILED: ['CLOSED'],
  CLOSED: [],
};

export const PROCUREMENT_FLOW = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT'],
  APPROVED: ['PO_ISSUED'],
  PO_ISSUED: ['ACTIVE'],
  ACTIVE: ['COMPLETED', 'TERMINATED'],
  COMPLETED: [],
  TERMINATED: [],
};

export function canTransition(flow, from, to) {
  return Array.isArray(flow[from]) && flow[from].includes(to);
}

export function assertTransition(flow, from, to, label = 'record') {
  if (!canTransition(flow, from, to)) {
    const err = new Error(`Illegal ${label} transition: ${from} -> ${to}`);
    err.status = 409;
    throw err;
  }
}

/** Which of the five stages a challenge is currently sitting in. */
export function stageOf(challengeStatus) {
  switch (challengeStatus) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
    case 'REJECTED':
      return 'ASSESS';
    case 'PUBLISHED':
    case 'CLOSED':
    case 'EVALUATION':
      return 'VALIDATE';
    case 'PILOT':
      return 'SANDBOX';
    case 'PROCURED':
      return 'ADOPT';
    case 'ARCHIVED':
      return 'RAMPUP';
    default:
      return 'ASSESS';
  }
}
