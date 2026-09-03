import { titleCase } from './format.js';

/**
 * Status vocabulary shared by every table, chip and filter.
 * Colour carries meaning consistently: green = cleared, saffron = in the
 * sandbox, violet = under assessment, red = stopped, grey = not yet live.
 */
const MAP = {
  // Challenge
  DRAFT: ['neutral', 'Draft'],
  PENDING_APPROVAL: ['warning', 'Awaiting approval'],
  PUBLISHED: ['accent', 'Open for applications'],
  CLOSED: ['neutral', 'Applications closed'],
  EVALUATION: ['violet', 'Under evaluation'],
  PILOT: ['pilot', 'In pilot'],
  PROCURED: ['success', 'Procured'],
  REJECTED: ['danger', 'Not taken forward'],
  ARCHIVED: ['neutral', 'Archived'],

  // Application
  SUBMITTED: ['info', 'Submitted'],
  ELIGIBILITY_FAIL: ['danger', 'Eligibility gate failed'],
  UNDER_EVALUATION: ['violet', 'Under evaluation'],
  SHORTLISTED: ['accent', 'Shortlisted'],
  SELECTED_FOR_PILOT: ['success', 'Selected for pilot'],
  WITHDRAWN: ['neutral', 'Withdrawn'],

  // Pilot
  AGREEMENT_PENDING: ['warning', 'Agreement pending'],
  ACTIVE: ['pilot', 'Active'],
  ON_HOLD: ['warning', 'On hold'],
  UNDER_REVIEW: ['violet', 'Under review'],
  SUCCESS: ['success', 'KPIs met'],
  PARTIAL: ['warning', 'Partially met'],
  FAILED: ['danger', 'KPIs not met'],

  // Procurement
  APPROVED: ['success', 'Approved'],
  PO_ISSUED: ['success', 'PO issued'],
  COMPLETED: ['success', 'Completed'],
  TERMINATED: ['danger', 'Terminated'],

  // Milestone / payment
  PENDING: ['neutral', 'Pending'],
  PAID: ['success', 'Paid'],
  DUE: ['warning', 'Due'],
  PROCESSING: ['info', 'Processing'],
  OVERDUE: ['danger', 'Overdue'],
  DISPUTED: ['danger', 'Disputed'],

  // Eligibility / KYC
  ELIGIBLE: ['success', 'Eligible'],
  INELIGIBLE: ['danger', 'Not eligible'],
  UNKNOWN: ['neutral', 'Not assessed'],
  VERIFIED: ['success', 'Verified'],

  // Evaluation
  ASSIGNED: ['warning', 'Awaiting score'],
  RECOMMEND: ['success', 'Recommended'],
  RECOMMEND_WITH_CONDITIONS: ['warning', 'Recommended with conditions'],
  NOT_RECOMMEND: ['danger', 'Not recommended'],

  // Grievance / catalogue / adoption
  OPEN: ['warning', 'Open'],
  RESOLVED: ['success', 'Resolved'],
  ESCALATED: ['danger', 'Escalated'],
  LISTED: ['success', 'Listed'],
  SUSPENDED: ['danger', 'Suspended'],
  EXPIRED: ['neutral', 'Expired'],
  REQUESTED: ['info', 'Requested'],
  DEPLOYED: ['success', 'Deployed'],
  SUSPENDED_USER: ['danger', 'Suspended'],
};

/**
 * A few codes read differently depending on what they are attached to.
 * REJECTED on a challenge means the head sent it back; on an application it
 * means the committee did not take it forward.
 */
const CONTEXT_OVERRIDES = {
  challenge: { REJECTED: 'Returned by head' },
  application: { REJECTED: 'Not taken forward' },
  pilot: { CLOSED: 'Closed' },
};

export function statusTone(code) {
  return MAP[code]?.[0] ?? 'neutral';
}

export function statusLabel(code, context) {
  return CONTEXT_OVERRIDES[context]?.[code] ?? MAP[code]?.[1] ?? titleCase(code || '');
}

/** Which of the five AVSAR stages a status belongs to. */
export const STAGE_OF_STATUS = {
  DRAFT: 'ASSESS', PENDING_APPROVAL: 'ASSESS', REJECTED: 'ASSESS',
  PUBLISHED: 'VALIDATE', CLOSED: 'VALIDATE', EVALUATION: 'VALIDATE',
  PILOT: 'SANDBOX',
  PROCURED: 'ADOPT',
  ARCHIVED: 'RAMPUP',
};
