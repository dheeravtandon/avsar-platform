import { Router } from 'express';
import { all } from '../db/index.js';
import { softAuthenticate } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { POLICY } from '../config.js';
import { STAGES, CHALLENGE_FLOW, APPLICATION_FLOW, PILOT_FLOW, PROCUREMENT_FLOW } from '../services/workflow.js';
import { relaxations } from '../services/eligibility.js';
import { MATCH_WEIGHTS } from '../services/matching.js';
import { BUCKET_CAP, QUALIFYING_TECHNICAL } from '../services/scoring.js';
import { ROLE_LABELS } from '../middleware/auth.js';

const router = Router();

export const SECTORS = [
  'Agriculture & Rural', 'Clean Energy', 'Defence & Aerospace', 'Education & Skilling',
  'Environment & Water', 'Governance & GovTech', 'Health & Life Sciences', 'Logistics & Mobility',
  'Manufacturing & Robotics', 'Public Safety & Policing', 'Smart Cities & Urban', 'Space',
];

export const CAPABILITY_TAGS = [
  'computer-vision', 'nlp', 'iot-sensors', 'edge-ai', 'drone', 'gis-remote-sensing',
  'blockchain', 'ar-vr', 'robotics', 'battery-tech', 'water-treatment', 'biotech-diagnostics',
  'data-analytics', 'cybersecurity', 'digital-payments', 'ml-forecasting', 'speech-recognition',
  'satellite-imagery', 'additive-manufacturing', 'assistive-tech',
];

export const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export const TRL_SCALE = [
  { level: 1, label: 'Basic principles observed' },
  { level: 2, label: 'Technology concept formulated' },
  { level: 3, label: 'Experimental proof of concept' },
  { level: 4, label: 'Validated in laboratory' },
  { level: 5, label: 'Validated in relevant environment' },
  { level: 6, label: 'Demonstrated in relevant environment' },
  { level: 7, label: 'Prototype demonstrated in operational environment' },
  { level: 8, label: 'System complete and qualified' },
  { level: 9, label: 'Proven in operational environment' },
];

/** Everything the client needs to render forms and legends, in one call. */
router.get('/', softAuthenticate, wrap(async (_req, res) => {
  res.json({
    platform: {
      name: 'AVSAR',
      expansion: 'Assess - Validate - Sandbox - Adopt - Ramp-up',
      subtitle: 'Startup-friendly public procurement mechanism',
      version: '1.0.0',
    },
    sectors: SECTORS,
    capabilityTags: CAPABILITY_TAGS,
    states: STATES,
    trlScale: TRL_SCALE,
    roles: ROLE_LABELS,
    stages: STAGES,
    flows: {
      challenge: CHALLENGE_FLOW,
      application: APPLICATION_FLOW,
      pilot: PILOT_FLOW,
      procurement: PROCUREMENT_FLOW,
    },
    policy: {
      ...POLICY,
      relaxations: relaxations(),
      references: [
        { code: 'DPIIT G.S.R. 127(E)', title: 'Definition of a startup', date: '19-Feb-2019' },
        { code: 'GFR 2017, Rule 173(i)', title: 'Relaxation of prior turnover and prior experience for startups' },
        { code: 'GFR 2017, Rule 170', title: 'Exemption from Earnest Money Deposit' },
        { code: 'GFR 2017, Rule 166', title: 'Single tender enquiry - proprietary or uniquely suited item' },
        { code: 'GFR 2017, Rule 149', title: 'Procurement through Government e-Marketplace' },
        { code: 'MSMED Act 2006, s.15', title: 'Payment within 45 days of acceptance' },
        { code: 'DPDP Act 2023', title: 'Digital Personal Data Protection - consent, purpose limitation, erasure' },
        { code: 'CERT-In Directions 2022', title: '6-hour incident reporting, 180-day log retention in India' },
        { code: 'GIGW 3.0 / WCAG 2.1 AA', title: 'Accessibility and usability of government websites' },
      ],
    },
    matching: { weights: MATCH_WEIGHTS, maxScore: 100 },
    evaluation: { bucketCap: BUCKET_CAP, qualifyingTechnical: QUALIFYING_TECHNICAL, criteria: all('SELECT * FROM evaluation_criteria ORDER BY bucket DESC, id') },
  });
}));

export default router;
