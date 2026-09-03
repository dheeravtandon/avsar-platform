/**
 * Deterministic demo dataset.
 *
 * Every record is fictional but shaped like the real thing: real ministries and
 * departments, plausible problem statements, DPIIT-style recognition numbers,
 * and a data spread that exercises every state in the workflow so a reviewer can
 * see the full lifecycle without clicking through it first.
 *
 *   node --run seed      (from server/)   or   npm run seed   (from repo root)
 */

import bcrypt from 'bcryptjs';
import { db, migrate, insert, run, get, all } from './index.js';
import { checkEligibility } from '../services/eligibility.js';
import { scoreMatch } from '../services/matching.js';
import { computeTotal } from '../services/scoring.js';
import { record } from '../services/audit.js';

const PASSWORD = 'Avsar@2026';
const hash = bcrypt.hashSync(PASSWORD, 8);
const CR = 1e7;
const L = 1e5;

migrate();
reset();

/* ------------------------------------------------------------ reference */

const criteria = [
  ['INNOV', 'Innovation and differentiation', 'How materially better is this than what the department can buy today?', 10, 1.5, 'TECHNICAL'],
  ['FEAS', 'Technical feasibility', 'Is the described approach sound and demonstrable at the stated TRL?', 10, 1.5, 'TECHNICAL'],
  ['KPIFIT', 'Fit to declared KPIs', 'Does the solution move the specific numbers the department published?', 10, 2, 'TECHNICAL'],
  ['TEAM', 'Team and delivery capability', 'Can this team deliver inside a government environment?', 10, 1, 'TECHNICAL'],
  ['SCALE', 'Scalability and interoperability', 'Will it survive a state-wide or national roll-out and integrate with existing systems?', 10, 1, 'TECHNICAL'],
  ['SEC', 'Security, privacy and DPDP readiness', 'Data handling, hosting, consent and audit posture.', 10, 1, 'TECHNICAL'],
  ['COST', 'Cost realism and value for money', 'Is the quote defensible against the outcome promised?', 10, 2, 'COMMERCIAL'],
  ['TCO', 'Total cost of ownership at scale', 'Licensing, support and exit cost over the contract horizon.', 10, 1, 'COMMERCIAL'],
  ['TIME', 'Delivery timeline credibility', 'Is the proposed schedule achievable with the stated team?', 10, 1, 'COMMERCIAL'],
];
for (const [code, label, description, max_score, weight, bucket] of criteria) {
  insert('evaluation_criteria', { code, label, description, max_score, weight, bucket });
}

/* ---------------------------------------------------------- departments */

const departments = [
  ['MOHUA-SCM', 'Smart Cities Mission Directorate', 'Ministry of Housing and Urban Affairs', 'CENTRAL', null, '2217-00-191', 12 * CR],
  ['MORTH-NH', 'National Highways Operations Wing', 'Ministry of Road Transport and Highways', 'CENTRAL', null, '3054-00-337', 18 * CR],
  ['MOHFW-NHM', 'National Health Mission - Digital Health', 'Ministry of Health and Family Welfare', 'CENTRAL', null, '2210-00-200', 9 * CR],
  ['MOA-KRISHI', 'Digital Agriculture Division', 'Ministry of Agriculture and Farmers Welfare', 'CENTRAL', null, '2401-00-109', 7.5 * CR],
  ['KA-BWSSB', 'Bengaluru Water Supply and Sewerage Board', 'Government of Karnataka', 'STATE', 'Karnataka', 'WS-2215-04', 4 * CR],
  ['MH-MSEDCL', 'Maharashtra State Electricity Distribution Co.', 'Government of Maharashtra', 'PSU', 'Maharashtra', 'PW-2801-80', 6 * CR],
  ['DL-TRAFFIC', 'Delhi Traffic Police - Technology Cell', 'Government of NCT of Delhi', 'STATE', 'Delhi', 'PS-2055-109', 3.5 * CR],
];
const deptIds = {};
for (const [code, name, ministry, level, state, budget_head, innovation_budget] of departments) {
  deptIds[code] = insert('departments', { code, name, ministry, level, state, budget_head, innovation_budget });
}

/* --------------------------------------------------------------- users */

const officials = [
  ['Ananya Raghunathan', 'nodal.scm@avsar.gov.in', 'NODAL_OFFICER', 'Deputy Secretary (Innovation)', 'MOHUA-SCM'],
  ['Vikram Sethi', 'head.scm@avsar.gov.in', 'DEPT_HEAD', 'Mission Director', 'MOHUA-SCM'],
  ['Rohit Menon', 'proc.scm@avsar.gov.in', 'PROCUREMENT_OFFICER', 'Director (Procurement)', 'MOHUA-SCM'],
  ['Sneha Bhatt', 'monitor.scm@avsar.gov.in', 'PILOT_MONITOR', 'Assistant Director (Projects)', 'MOHUA-SCM'],
  ['Imran Qureshi', 'nodal.nh@avsar.gov.in', 'NODAL_OFFICER', 'Chief Engineer (Operations)', 'MORTH-NH'],
  ['Lalitha Krishnan', 'head.nh@avsar.gov.in', 'DEPT_HEAD', 'Member (Technical)', 'MORTH-NH'],
  ['Devika Nair', 'nodal.nhm@avsar.gov.in', 'NODAL_OFFICER', 'Joint Director (Digital Health)', 'MOHFW-NHM'],
  ['Arun Prakash', 'head.nhm@avsar.gov.in', 'DEPT_HEAD', 'Mission Director (NHM)', 'MOHFW-NHM'],
  ['Farhan Ali', 'nodal.krishi@avsar.gov.in', 'NODAL_OFFICER', 'Additional Commissioner', 'MOA-KRISHI'],
  ['Meera Joshi', 'nodal.bwssb@avsar.gov.in', 'NODAL_OFFICER', 'Executive Engineer (NRW Cell)', 'KA-BWSSB'],
  ['Suresh Kulkarni', 'head.bwssb@avsar.gov.in', 'DEPT_HEAD', 'Chairman', 'KA-BWSSB'],
  ['Pooja Deshmukh', 'nodal.msedcl@avsar.gov.in', 'NODAL_OFFICER', 'Superintending Engineer', 'MH-MSEDCL'],
  ['Harpreet Singh', 'nodal.traffic@avsar.gov.in', 'NODAL_OFFICER', 'DCP (Technology)', 'DL-TRAFFIC'],
];
const userIds = {};
for (const [name, email, role, designation, dept] of officials) {
  userIds[email] = insert('users', { name, email, password_hash: hash, role, designation, dept_id: deptIds[dept] });
}

const evaluators = [
  ['Dr. Kavita Iyer', 'eval.kavita@avsar.gov.in', 'Professor, Urban Systems, IIT Madras', ['Smart Cities & Urban', 'iot-sensors', 'data-analytics']],
  ['Dr. Sanjay Bose', 'eval.sanjay@avsar.gov.in', 'Principal Scientist, CSIR-CRRI', ['Logistics & Mobility', 'computer-vision', 'ml-forecasting']],
  ['Dr. Rehana Fatima', 'eval.rehana@avsar.gov.in', 'Head, Health Informatics, AIIMS', ['Health & Life Sciences', 'nlp', 'biotech-diagnostics']],
  ['Dr. Nitin Chaudhary', 'eval.nitin@avsar.gov.in', 'Scientist-G, Department of Science and Technology', ['Environment & Water', 'iot-sensors']],
  ['Dr. Anjali Verma', 'eval.anjali@avsar.gov.in', 'Fellow, National Institute of Agricultural Economics', ['Agriculture & Rural', 'satellite-imagery', 'ml-forecasting']],
  ['Dr. Prakash Rao', 'eval.prakash@avsar.gov.in', 'Adviser (Cyber Security), MeitY', ['Governance & GovTech', 'cybersecurity', 'blockchain']],
];
for (const [name, email, designation, expertise] of evaluators) {
  userIds[email] = insert('users', { name, email, password_hash: hash, role: 'EVALUATOR', designation, expertise: JSON.stringify(expertise) });
}

userIds['admin@avsar.gov.in'] = insert('users', {
  name: 'Platform Administrator', email: 'admin@avsar.gov.in', password_hash: hash,
  role: 'ADMIN', designation: 'Scientist-E, National Informatics Centre',
});

/* ------------------------------------------------------------ startups */

const startups = [
  ['Netratva Vision Systems Pvt Ltd', 'Netratva', 'founder@netratva.in', 'Aditi Sharma', 'Smart Cities & Urban', 'Video analytics', 7,
    ['computer-vision', 'edge-ai', 'iot-sensors'], '2021-03-18', 'Bengaluru', 'Karnataka', 34, 0, 2.4 * CR, 1],
  ['Setu Roadtech Innovations Pvt Ltd', 'SetuRoad', 'founder@seturoad.in', 'Karan Bhatia', 'Logistics & Mobility', 'Pavement condition AI', 6,
    ['computer-vision', 'gis-remote-sensing', 'ml-forecasting'], '2022-07-02', 'Pune', 'Maharashtra', 21, 0, 1.1 * CR, 0],
  ['Aarogya Bhasha Labs Pvt Ltd', 'AarogyaBhasha', 'founder@aarogyabhasha.in', 'Dr. Nandini Rao', 'Health & Life Sciences', 'Clinical NLP', 6,
    ['nlp', 'speech-recognition', 'data-analytics'], '2020-11-24', 'Hyderabad', 'Telangana', 45, 1, 4.8 * CR, 1],
  ['Jal Sarthi Technologies LLP', 'JalSarthi', 'founder@jalsarthi.in', 'Ramesh Pillai', 'Environment & Water', 'Non-revenue water', 7,
    ['iot-sensors', 'water-treatment', 'data-analytics'], '2019-05-09', 'Chennai', 'Tamil Nadu', 28, 0, 3.2 * CR, 1],
  ['Krishi Drishti Analytics Pvt Ltd', 'KrishiDrishti', 'founder@krishidrishti.in', 'Sneha Patil', 'Agriculture & Rural', 'Crop advisory', 6,
    ['satellite-imagery', 'ml-forecasting', 'gis-remote-sensing'], '2022-01-15', 'Nashik', 'Maharashtra', 18, 1, 65 * L, 0],
  ['Vidyut Grid Labs Pvt Ltd', 'VidyutGrid', 'founder@vidyutgrid.in', 'Ashok Reddy', 'Clean Energy', 'Distribution loss analytics', 7,
    ['data-analytics', 'iot-sensors', 'ml-forecasting'], '2020-09-30', 'Hyderabad', 'Telangana', 39, 0, 5.6 * CR, 1],
  ['Suraksha Edge Systems Pvt Ltd', 'SurakshaEdge', 'founder@surakshaedge.in', 'Neha Kapoor', 'Public Safety & Policing', 'Traffic enforcement', 6,
    ['computer-vision', 'edge-ai', 'cybersecurity'], '2021-08-11', 'New Delhi', 'Delhi', 26, 1, 1.9 * CR, 0],
  ['Anantara Sensors Pvt Ltd', 'Anantara', 'founder@anantara.in', 'Vivek Menon', 'Environment & Water', 'Air and water sensing', 5,
    ['iot-sensors', 'edge-ai'], '2023-02-20', 'Kochi', 'Kerala', 12, 0, 22 * L, 0],
  ['Nirman Robotics Pvt Ltd', 'NirmanBots', 'founder@nirmanbots.in', 'Tarun Gupta', 'Manufacturing & Robotics', 'Inspection robotics', 6,
    ['robotics', 'computer-vision', 'additive-manufacturing'], '2021-12-05', 'Ahmedabad', 'Gujarat', 31, 0, 2.7 * CR, 0],
  ['Sanchay Fintech Labs Pvt Ltd', 'Sanchay', 'founder@sanchay.in', 'Priya Iyengar', 'Governance & GovTech', 'Beneficiary payments', 7,
    ['digital-payments', 'data-analytics', 'cybersecurity'], '2018-04-12', 'Mumbai', 'Maharashtra', 58, 1, 9.4 * CR, 1],
  // Deliberately ineligible: incorporated more than ten years ago.
  ['Purvanchal Systems Pvt Ltd', 'Purvanchal', 'founder@purvanchal.in', 'Manoj Tiwari', 'Governance & GovTech', 'Legacy integration', 8,
    ['data-analytics'], '2012-06-01', 'Lucknow', 'Uttar Pradesh', 140, 0, 38 * CR, 1],
  // Deliberately ineligible: turnover above the INR 100 crore ceiling.
  ['Trinetra Infotech Pvt Ltd', 'Trinetra', 'founder@trinetra.in', 'Sudhir Bansal', 'Smart Cities & Urban', 'City command centres', 8,
    ['computer-vision', 'data-analytics'], '2019-01-20', 'Noida', 'Uttar Pradesh', 320, 0, 128 * CR, 1],
];

const startupIds = {};
startups.forEach((s, i) => {
  const [legal, brand, email, founder, sector, subSector, trl, caps, inc, city, state, employees, womenLed, turnover, priorOrder] = s;
  const uid = insert('users', { name: founder, email, password_hash: hash, role: 'STARTUP', designation: 'Founder & CEO' });
  const profile = {
    user_id: uid,
    legal_name: legal,
    brand_name: brand,
    entity_type: legal.includes('LLP') ? 'LLP' : 'PRIVATE_LIMITED',
    cin: `U72900${state.slice(0, 2).toUpperCase()}${inc.slice(0, 4)}PTC${100000 + i * 137}`,
    dpiit_number: `DIPP${160000 + i * 411}`,
    dpiit_valid_till: '2030-12-31',
    udyam_number: `UDYAM-${state.slice(0, 2).toUpperCase()}-03-${String(1000000 + i * 7919).slice(0, 7)}`,
    gstin: `${27 + (i % 10)}AABCT${1000 + i}K1Z${i % 10}`,
    incorporation_date: inc,
    sector,
    sub_sector: subSector,
    trl,
    capabilities: JSON.stringify(caps),
    website: `https://www.${brand.toLowerCase()}.in`,
    city,
    state,
    employees,
    women_led: womenLed,
    turnover_last_fy: turnover,
    has_prior_govt_order: priorOrder,
    is_split_reconstruction: 0,
    kyc_status: 'VERIFIED',
    kyc_verified_at: new Date().toISOString(),
    profile_completeness: 100,
  };
  const verdict = checkEligibility(profile);
  profile.eligibility_status = verdict.status;
  profile.eligibility_json = JSON.stringify(verdict);
  startupIds[brand] = insert('startups', profile);
});

/* ------------------------------------------------------------ challenges */

const challenges = [
  {
    dept: 'KA-BWSSB', owner: 'nodal.bwssb@avsar.gov.in', head: 'head.bwssb@avsar.gov.in',
    title: 'Cut non-revenue water loss in two Bengaluru distribution zones below 15%',
    sector: 'Environment & Water',
    problem: 'Non-revenue water in the two pilot zones stands at 34% against a national benchmark of 15%. Losses are a mix of physical leakage in ageing AC and CI mains and unbilled authorised consumption. The board cannot currently localise a burst to better than a 2 km stretch, so repair crews are dispatched on complaint rather than on detection, and the mean time to repair is eleven days.',
    background: 'The two zones cover 148 km of distribution main and roughly 62,000 service connections. SCADA exists at the reservoir level only; there is no district metered area instrumentation downstream.',
    baseline: 'NRW 34%. Mean time to detect a burst: 6.5 days. Mean time to repair: 11 days. Zero automated leak alerts.',
    outcome: 'A deployable detection and localisation capability that brings NRW under 15% in the pilot zones and can be extended board-wide.',
    kpis: [
      { key: 'nrw', label: 'Non-revenue water', target: 15, unit: '%', direction: 'DOWN' },
      { key: 'mttd', label: 'Mean time to detect a burst', target: 24, unit: 'hours', direction: 'DOWN' },
      { key: 'alerts', label: 'Verified leak alerts per month', target: 40, unit: 'alerts', direction: 'UP' },
    ],
    tags: ['iot-sensors', 'data-analytics', 'water-treatment'],
    trlMin: 6, budget: 48 * L, months: 6, scaleValue: 11 * CR, scaleUnits: '9 remaining zones',
    env: 'Field deployment on live distribution mains; no public internet at valve chambers.',
    data: 'Two years of billing data, GIS network layer, reservoir SCADA history.',
    status: 'PROCURED', publishedDaysAgo: 250,
  },
  {
    dept: 'MORTH-NH', owner: 'nodal.nh@avsar.gov.in', head: 'head.nh@avsar.gov.in',
    title: 'Automated pavement distress survey for 1,200 km of national highway without lane closure',
    sector: 'Logistics & Mobility',
    problem: 'Pavement condition on the corridor is surveyed manually once a year by walking teams, which requires lane closure, takes eleven weeks, and produces a subjective distress rating. Maintenance budgets are therefore allocated against data that is up to a year stale, and emergency repairs consume a disproportionate share of the head.',
    background: 'The corridor comprises 1,200 km of four- and six-lane divided carriageway across three states, with mixed bituminous and rigid pavement.',
    baseline: 'Survey cycle 11 weeks. Annual frequency. Manual distress rating, inter-rater agreement about 0.6. Lane closure required.',
    outcome: 'A vehicle-mounted or equivalent survey capability producing IRC-compliant distress indices at highway speed, refreshed quarterly.',
    kpis: [
      { key: 'cycle', label: 'Survey cycle time', target: 14, unit: 'days', direction: 'DOWN' },
      { key: 'accuracy', label: 'Agreement with expert manual rating', target: 90, unit: '%', direction: 'UP' },
      { key: 'coverage', label: 'Corridor length covered per quarter', target: 1200, unit: 'km', direction: 'UP' },
    ],
    tags: ['computer-vision', 'gis-remote-sensing', 'ml-forecasting'],
    trlMin: 6, budget: 65 * L, months: 5, scaleValue: 22 * CR, scaleUnits: '18,000 km network',
    env: 'Survey vehicle at 60-80 km/h in live traffic; output to the existing HMS.',
    data: 'Historic condition surveys, chainage-referenced GIS, maintenance ledger.',
    status: 'PILOT', publishedDaysAgo: 150,
  },
  {
    dept: 'MOHFW-NHM', owner: 'nodal.nhm@avsar.gov.in', head: 'head.nhm@avsar.gov.in',
    title: 'Structure vernacular OPD case notes from 40 district hospitals into coded clinical data',
    sector: 'Health & Life Sciences',
    problem: 'OPD case sheets at district hospitals are written by hand in a mix of English and the regional language. The data never enters a structured system, so disease surveillance depends on a separate manual tally that lags by three weeks and misses most non-notifiable presentations. Clinicians will not accept a workflow that adds keystrokes at the point of care.',
    background: '40 district hospitals across two states, roughly 18,000 OPD encounters a day in aggregate. ABDM-compliant HMIS is present but under-used.',
    baseline: 'Surveillance lag 21 days. Structured capture under 8% of encounters. No coded diagnosis for OPD.',
    outcome: 'Coded, ABDM-conformant structured records generated from existing clinician behaviour, with no net increase in consultation time.',
    kpis: [
      { key: 'lag', label: 'Surveillance reporting lag', target: 2, unit: 'days', direction: 'DOWN' },
      { key: 'capture', label: 'Encounters with coded diagnosis', target: 80, unit: '%', direction: 'UP' },
      { key: 'time', label: 'Added consultation time per encounter', target: 0, unit: 'seconds', direction: 'DOWN' },
    ],
    tags: ['nlp', 'speech-recognition', 'data-analytics'],
    trlMin: 5, budget: 55 * L, months: 6, scaleValue: 16 * CR, scaleUnits: '740 districts',
    env: 'District hospital OPD, intermittent connectivity, ABDM sandbox integration.',
    data: 'De-identified case sheet images, ICD-10 mapping tables, ABDM API sandbox.',
    status: 'EVALUATION', publishedDaysAgo: 80,
  },
  {
    dept: 'DL-TRAFFIC', owner: 'nodal.traffic@avsar.gov.in', head: null,
    title: 'Detect and evidence wrong-side driving at 25 junctions to an admissible standard',
    sector: 'Public Safety & Policing',
    problem: 'Wrong-side driving accounts for a disproportionate share of junction collisions, but enforcement depends on an officer physically witnessing the offence. Existing CCTV records the event yet produces no usable evidence pack, so challans issued on camera footage are routinely set aside for want of a defensible chain of custody.',
    background: '25 high-incident junctions already carry IP cameras on the police network. Any solution must run on that footage without new civil works.',
    baseline: 'Manual detection only. Roughly 40 challans per junction per month. Evidence pack assembled by hand in 25 minutes.',
    outcome: 'Automated detection with a tamper-evident evidence pack accepted by the adjudicating authority.',
    kpis: [
      { key: 'precision', label: 'Detection precision on audited sample', target: 95, unit: '%', direction: 'UP' },
      { key: 'pack', label: 'Time to assemble an evidence pack', target: 60, unit: 'seconds', direction: 'DOWN' },
      { key: 'upheld', label: 'Challans upheld on contest', target: 90, unit: '%', direction: 'UP' },
    ],
    tags: ['computer-vision', 'edge-ai', 'cybersecurity'],
    trlMin: 6, budget: 42 * L, months: 4, scaleValue: 8 * CR, scaleUnits: '340 junctions',
    env: 'Existing police IP camera network, on-premise inference, no cloud egress of footage.',
    data: '90 days of retained footage at four representative junctions, historical challan outcomes.',
    status: 'PUBLISHED', publishedDaysAgo: 25,
  },
  {
    dept: 'MOA-KRISHI', owner: 'nodal.krishi@avsar.gov.in', head: null,
    title: 'Plot-level sowing advisory for 200,000 smallholders using satellite and weather data',
    sector: 'Agriculture & Rural',
    problem: 'Sowing advisories are issued at the block level and reach farmers through extension officers, which means a single recommendation covers plots with materially different soil moisture, sowing windows and residual nitrogen. Adoption is low because the advice does not match what the farmer sees in the field.',
    background: 'Target districts hold roughly 200,000 registered smallholders with an average holding of 1.1 hectares. Agristack farmer registry and plot geometry are available.',
    baseline: 'Block-level advisory. Farmer-reported adoption 22%. No plot-level soil moisture estimate.',
    outcome: 'Plot-level, vernacular, timely advisory delivered on the channels farmers already use.',
    kpis: [
      { key: 'adoption', label: 'Advisory adoption reported by farmers', target: 55, unit: '%', direction: 'UP' },
      { key: 'plots', label: 'Plots receiving individualised advisory', target: 200000, unit: 'plots', direction: 'UP' },
      { key: 'yieldgain', label: 'Yield improvement in treated plots', target: 8, unit: '%', direction: 'UP' },
    ],
    tags: ['satellite-imagery', 'ml-forecasting', 'gis-remote-sensing'],
    trlMin: 5, budget: 38 * L, months: 6, scaleValue: 14 * CR, scaleUnits: '12 more districts',
    env: 'Delivery over IVR and WhatsApp in two languages; integration with the Agristack registry.',
    data: 'Agristack plot geometry, IMD weather grids, four seasons of yield records.',
    status: 'PUBLISHED', publishedDaysAgo: 20,
  },
  {
    dept: 'MH-MSEDCL', owner: 'nodal.msedcl@avsar.gov.in', head: null,
    title: 'Pinpoint commercial loss on 11 kV feeders serving 60,000 consumers',
    sector: 'Clean Energy',
    problem: 'Aggregate technical and commercial loss on the selected feeders is 21%, but the utility cannot separate technical loss from theft without a feeder-by-feeder energy audit that takes a crew two weeks per feeder. Enforcement drives are therefore untargeted and yield poorly.',
    background: '58 feeders, mixed urban and peri-urban, with AMI at the feeder head and conventional meters downstream.',
    baseline: 'AT&C loss 21%. Manual energy audit 14 days per feeder. Theft detection hit rate 12%.',
    outcome: 'A data-driven ranking of suspected commercial loss down to the distribution transformer, refreshed monthly.',
    kpis: [
      { key: 'atc', label: 'AT&C loss on pilot feeders', target: 14, unit: '%', direction: 'DOWN' },
      { key: 'hitrate', label: 'Enforcement hit rate on flagged premises', target: 45, unit: '%', direction: 'UP' },
      { key: 'audit', label: 'Energy audit turnaround per feeder', target: 2, unit: 'days', direction: 'DOWN' },
    ],
    tags: ['data-analytics', 'ml-forecasting', 'iot-sensors'],
    trlMin: 6, budget: 52 * L, months: 5, scaleValue: 19 * CR, scaleUnits: '2,400 feeders',
    env: 'Read-only integration with the existing MDM and billing system.',
    data: '36 months of consumer billing, feeder-head AMI reads, DT master.',
    status: 'PUBLISHED', publishedDaysAgo: 14,
  },
  {
    dept: 'MOHUA-SCM', owner: 'nodal.scm@avsar.gov.in', head: 'head.scm@avsar.gov.in',
    title: 'Automated solid waste vehicle route compliance across three municipal corporations',
    sector: 'Smart Cities & Urban',
    problem: 'Door-to-door waste collection is contracted on a per-route basis, but compliance is verified from GPS traces that contractors can and do spoof by driving the route without collecting. Citizen complaints are the only real signal, and they arrive too late to withhold payment for the month in question.',
    background: 'Three corporations, 640 collection vehicles, roughly 2,100 daily routes.',
    baseline: 'Compliance verified on GPS trace alone. Complaint rate 340 per month. Payment deduction applied to under 2% of invoices.',
    outcome: 'Verified proof of collection at the household or bin level that can support a payment deduction.',
    kpis: [
      { key: 'verified', label: 'Routes with verified proof of collection', target: 95, unit: '%', direction: 'UP' },
      { key: 'complaints', label: 'Citizen complaints per month', target: 100, unit: 'complaints', direction: 'DOWN' },
      { key: 'recovery', label: 'Contract value correctly deducted', target: 6, unit: '%', direction: 'UP' },
    ],
    tags: ['computer-vision', 'iot-sensors', 'edge-ai'],
    trlMin: 6, budget: 45 * L, months: 5, scaleValue: 26 * CR, scaleUnits: '100 Smart Cities',
    env: 'Vehicle-mounted hardware, 2G/4G mixed coverage, integration with the ULB billing system.',
    data: 'Route master, 12 months of GPS traces, complaint register.',
    status: 'PENDING_APPROVAL',
  },
  {
    dept: 'MOHUA-SCM', owner: 'nodal.scm@avsar.gov.in', head: 'head.scm@avsar.gov.in',
    title: 'Structural health monitoring for 40 municipal flyovers and pedestrian bridges',
    sector: 'Smart Cities & Urban',
    problem: 'Structural inspection is visual, annual and qualitative. There is no instrumented baseline, so a deterioration trend can only be inferred from successive inspector opinions, and the corporation cannot defend a decision either to close a structure or to keep it open.',
    background: '40 structures of mixed age, the oldest commissioned in 1978.',
    baseline: 'Annual visual inspection. No instrumentation. No quantitative deterioration trend.',
    outcome: 'Continuous instrumented monitoring with an alerting threshold agreed with the structural consultant.',
    kpis: [
      { key: 'instrumented', label: 'Structures under continuous monitoring', target: 40, unit: 'structures', direction: 'UP' },
      { key: 'lead', label: 'Warning lead time before visual detectability', target: 60, unit: 'days', direction: 'UP' },
      { key: 'falsealarm', label: 'False alarm rate', target: 5, unit: '%', direction: 'DOWN' },
    ],
    tags: ['iot-sensors', 'edge-ai', 'data-analytics'],
    trlMin: 5, budget: 40 * L, months: 6, scaleValue: 9 * CR, scaleUnits: '260 structures',
    env: 'Outdoor, unpowered locations on live structures.',
    data: 'Inspection history, as-built drawings for 28 of 40 structures.',
    status: 'DRAFT',
  },
];

const chIds = [];
challenges.forEach((c, i) => {
  const code = `AVS/CH/2026/${String(i + 1).padStart(4, '0')}`;
  const published = ['PUBLISHED', 'CLOSED', 'EVALUATION', 'PILOT', 'PROCURED'].includes(c.status);
  const id = insert('challenges', {
    code,
    dept_id: deptIds[c.dept],
    created_by: userIds[c.owner],
    title: c.title,
    problem_statement: c.problem,
    background: c.background,
    current_baseline: c.baseline,
    desired_outcome: c.outcome,
    success_kpis: JSON.stringify(c.kpis),
    sector: c.sector,
    tags: JSON.stringify(c.tags),
    trl_min: c.trlMin,
    pilot_budget_ceiling: c.budget,
    pilot_duration_months: c.months,
    scale_value: c.scaleValue,
    scale_units: c.scaleUnits,
    deployment_env: c.env,
    data_availability: c.data,
    ip_terms: 'STARTUP_RETAINS',
    status: c.status,
    approved_by: published && c.head ? userIds[c.head] : null,
    published_at: published ? daysAgo(c.publishedDaysAgo) : null,
    closes_at: published ? daysAhead(30 - i * 2) : null,
    created_at: daysAgo((c.publishedDaysAgo ?? 20) + 18),
  });
  chIds.push(id);
});

/* ---------------------------------------------------------- applications */

const applications = [
  // NRW challenge (index 0) - procured
  { ch: 0, brand: 'JalSarthi', title: 'AquaSense district metering with acoustic correlation', cost: 46 * L, weeks: 22, status: 'SELECTED_FOR_PILOT',
    summary: 'Battery-powered acoustic loggers on existing valve chambers combined with virtual district metering derived from billing and reservoir SCADA. Localises a burst to a 40 m segment without excavation and without new civil works.',
    approach: 'Twelve acoustic loggers per zone on a LoRaWAN backhaul, night-flow analysis against a learned per-zone baseline, correlation between logger pairs to fix the leak position. Alerts land in the existing complaint system as a work order.',
    diff: 'Correlation runs on-device, so the system works where there is no cellular coverage at the chamber. Loggers are recovered and redeployed after each zone, which is what keeps the per-zone cost down.',
    risks: 'Acoustic correlation degrades on plastic mains. Mitigated by pressure-transient analysis as a secondary signal on PVC segments.' },
  { ch: 0, brand: 'Anantara', title: 'Distributed pressure and flow telemetry', cost: 44 * L, weeks: 24, status: 'REJECTED',
    summary: 'Pressure sensors at 30 points per zone feeding a hydraulic model that flags anomalies against expected pressure. Lower unit cost than acoustic methods but coarser localisation.',
    approach: 'Sensor mesh, calibrated EPANET model, anomaly detection on residuals.',
    diff: 'Lowest hardware cost per kilometre of main.', risks: 'Localisation resolution around 300 m, which still requires a crew search.' },

  // Pavement challenge (index 1) - in pilot
  { ch: 1, brand: 'SetuRoad', title: 'RoadLens highway-speed pavement distress survey', cost: 61 * L, weeks: 20, status: 'SELECTED_FOR_PILOT',
    summary: 'A vehicle-mounted stereo camera and inertial rig that captures pavement at 80 km/h and produces IRC:82 compliant distress indices, chainage-referenced and ready for the highway management system.',
    approach: 'Stereo capture at 60 fps, on-vehicle inference for cracking, ravelling, rutting and pothole classes, IMU-derived roughness, GNSS chainage referencing, nightly upload and QA sampling.',
    diff: 'Runs on a standard survey vehicle with no lane closure and no profilometer. The distress model is trained on Indian bituminous surfaces rather than transferred from a European dataset.',
    risks: 'Night and heavy-rain capture quality. Mitigated by a capture-quality gate that re-queues affected chainage.' },
  { ch: 1, brand: 'Netratva', title: 'Corridor condition intelligence from fleet dashcams', cost: 58 * L, weeks: 24, status: 'SHORTLISTED',
    summary: 'Crowd-sourced capture from commercial fleet dashcams already operating on the corridor, aggregated into a condition index that refreshes weekly rather than quarterly.',
    approach: 'Partner fleet integration, monocular depth estimation, temporal aggregation across passes.',
    diff: 'No survey vehicle and no marginal cost per kilometre once fleets are onboarded.',
    risks: 'Camera heterogeneity across the fleet; accuracy is lower than a calibrated rig on fine cracking.' },

  // Clinical NLP challenge (index 2) - under evaluation
  { ch: 2, brand: 'AarogyaBhasha', title: 'Sunetra ambient clinical documentation', cost: 53 * L, weeks: 24, status: 'UNDER_EVALUATION',
    summary: 'An ambient capture device at the OPD table that transcribes the clinician-patient exchange in Hindi, Telugu and English, extracts the diagnosis and prescription, and writes an ABDM-conformant record without the clinician typing.',
    approach: 'Edge speech recognition fine-tuned on Indian clinical vernacular, a clinical entity extractor mapped to ICD-10 and SNOMED subsets, a two-second clinician confirmation step, ABDM linkage on consent.',
    diff: 'Adds no keystrokes. The confirmation step is the only interaction, which is what makes clinician adoption plausible at scale.',
    risks: 'OPD ambient noise; code assignment on rare presentations. Mitigated by a low-confidence queue routed to a coder.' },
  { ch: 2, brand: 'Sanchay', title: 'Case sheet digitisation with a coding workbench', cost: 49 * L, weeks: 22, status: 'UNDER_EVALUATION',
    summary: 'High-throughput scanning of handwritten case sheets with handwriting recognition and a human coding workbench that clears the low-confidence residue.',
    approach: 'Batch scanning at the records room, handwriting recognition, coder workbench, nightly push to the HMIS.',
    diff: 'Requires no change at all to the consultation itself.',
    risks: 'Introduces a one-day lag and an ongoing coder cost that scales with volume.' },
  { ch: 2, brand: 'Netratva', title: 'Form-capture assist for OPD registers', cost: 41 * L, weeks: 18, status: 'UNDER_EVALUATION',
    summary: 'A phone-based capture of the OPD register page with structured extraction, targeted at facilities where no HMIS terminal is available at the point of care.',
    approach: 'Guided capture, layout-aware extraction, offline queue with sync on connectivity.',
    diff: 'Needs no hardware beyond a phone already in the facility.',
    risks: 'Depends on register legibility and on a staff member remembering to capture each page.' },

  // Wrong-side driving (index 3) - open, applications in
  { ch: 3, brand: 'SurakshaEdge', title: 'Pratyaksh wrong-side detection with signed evidence packs', cost: 39 * L, weeks: 16, status: 'SUBMITTED',
    summary: 'On-premise inference against the existing camera network that detects wrong-side movement and assembles a tamper-evident evidence pack: clip, plate read, timestamp, junction identity and a hash chained to a daily notary record.',
    approach: 'Direction-of-travel modelling per junction lane, ANPR, evidence pack assembly with SHA-256 chaining and an internal timestamping authority, export in the adjudication system format.',
    diff: 'The evidence pack, not the detection, is the hard part. The chain-of-custody design was reviewed against how challans have previously been set aside on contest.',
    risks: 'Plate recognition at night on two-wheelers. Mitigated by a manual review queue below a confidence threshold.' },
  { ch: 3, brand: 'Netratva', title: 'Junction behaviour analytics suite', cost: 41 * L, weeks: 18, status: 'SUBMITTED',
    summary: 'A general junction analytics layer covering wrong-side driving, red-light violation, helmet compliance and turning-movement counts from the same camera feed.',
    approach: 'Multi-task detection on a shared backbone, per-junction calibration, analytics dashboard.',
    diff: 'One deployment yields four enforcement and planning use cases.',
    risks: 'Broader scope means the evidence-pack requirement is met to a lower standard than a dedicated build.' },

  // Agri advisory (index 4)
  { ch: 4, brand: 'KrishiDrishti', title: 'Khet Salah plot-level advisory', cost: 36 * L, weeks: 22, status: 'SUBMITTED',
    summary: 'Plot-level soil moisture and sowing-window estimation from Sentinel-1 and Sentinel-2 fused with IMD grids, delivered as a 40-second IVR call and a WhatsApp card in Marathi and Hindi.',
    approach: 'Radar-derived soil moisture at 10 m, crop-stage classification, an agronomy rule layer reviewed by the state agriculture university, delivery over IVR and WhatsApp with a callback for questions.',
    diff: 'Advisory is generated per plot geometry from the Agristack registry rather than per block, and the delivery channel is the one farmers in these districts already answer.',
    risks: 'Cloud cover during the monsoon sowing window. Mitigated by the radar channel, which is unaffected.' },
  { ch: 4, brand: 'Anantara', title: 'In-field soil moisture probe network', cost: 37 * L, weeks: 20, status: 'ELIGIBILITY_FAIL',
    summary: 'Physical soil moisture probes at a sampling density of one per 40 hectares, interpolated to plot level.',
    approach: 'Probe network, LoRa backhaul, kriging interpolation.',
    diff: 'Ground truth rather than inference.',
    risks: 'Probe survival and recovery across a farming season.' },

  // MSEDCL (index 5)
  { ch: 5, brand: 'VidyutGrid', title: 'Grid Lens commercial loss ranking', cost: 50 * L, weeks: 20, status: 'SUBMITTED',
    summary: 'A monthly ranked list of distribution transformers and premises by expected commercial loss, built from billing behaviour, feeder-head energy balance and consumption anomalies, with a field verification app for the enforcement crew.',
    approach: 'DT-level energy balance from AMI and billing, consumption anomaly features, gradient-boosted ranking calibrated against past confirmed theft cases, closed-loop retraining on enforcement outcomes.',
    diff: 'Ranked by expected recoverable units rather than by anomaly score, so a crew day is spent where it recovers the most energy.',
    risks: 'DT-to-consumer mapping quality in the existing master. Handled by a mapping-confidence score that suppresses low-confidence DTs.' },
  { ch: 5, brand: 'Sanchay', title: 'Billing integrity analytics', cost: 47 * L, weeks: 18, status: 'SUBMITTED',
    summary: 'Detection of billing-side commercial loss: meter reading manipulation, unbilled connections and tariff misclassification.',
    approach: 'Reading-pattern forensics, tariff conformance checks, unbilled connection discovery from GIS and billing joins.',
    diff: 'Targets the billing process rather than the physical network.',
    risks: 'Does not address direct hooking, which is a material share of the loss on these feeders.' },
];

const appIds = [];
applications.forEach((a, i) => {
  const challenge = get('SELECT * FROM challenges WHERE id = ?', [chIds[a.ch]]);
  const startup = get('SELECT * FROM startups WHERE id = ?', [startupIds[a.brand]]);
  const eligibility = checkEligibility(startup);
  const match = scoreMatch(startup, challenge);

  const id = insert('applications', {
    code: `AVS/AP/2026/${String(i + 1).padStart(4, '0')}`,
    challenge_id: challenge.id,
    startup_id: startup.id,
    solution_title: a.title,
    solution_summary: a.summary,
    approach: a.approach,
    trl_claimed: startup.trl,
    prior_deployments: startup.has_prior_govt_order ? 'Two prior state government deployments, references available on request.' : 'First government engagement. Three private-sector deployments at comparable scale.',
    team_size: Math.max(4, Math.round(startup.employees * 0.4)),
    quoted_pilot_cost: a.cost,
    timeline_weeks: a.weeks,
    differentiators: a.diff,
    risks: a.risks,
    attachments: JSON.stringify([
      { name: 'Technical proposal.pdf', type: 'application/pdf' },
      { name: 'DPIIT recognition certificate.pdf', type: 'application/pdf' },
      { name: 'Pilot cost breakup.xlsx', type: 'application/vnd.ms-excel' },
    ]),
    eligibility_snapshot: JSON.stringify({ eligibility, match, evaluatedAt: new Date().toISOString() }),
    match_score: match.score,
    status: a.status,
    // Submitted a fortnight after the problem statement went live, so the
    // published-to-application cycle time on the dashboard is meaningful.
    submitted_at: addDays(challenge.published_at ?? daysAgo(30), 14 + (i % 4)),
    created_at: addDays(challenge.published_at ?? daysAgo(32), 11 + (i % 4)),
  });
  appIds.push(id);
});

/* ---------------------------------------------------------- evaluations */

const committees = [
  { app: 0, evaluators: ['eval.nitin@avsar.gov.in', 'eval.kavita@avsar.gov.in', 'eval.prakash@avsar.gov.in'], base: 8.4, rec: 'RECOMMEND' },
  { app: 1, evaluators: ['eval.nitin@avsar.gov.in', 'eval.kavita@avsar.gov.in'], base: 5.6, rec: 'NOT_RECOMMEND' },
  { app: 2, evaluators: ['eval.sanjay@avsar.gov.in', 'eval.kavita@avsar.gov.in', 'eval.prakash@avsar.gov.in'], base: 8.7, rec: 'RECOMMEND' },
  { app: 3, evaluators: ['eval.sanjay@avsar.gov.in', 'eval.kavita@avsar.gov.in'], base: 7.2, rec: 'RECOMMEND_WITH_CONDITIONS' },
  { app: 4, evaluators: ['eval.rehana@avsar.gov.in', 'eval.prakash@avsar.gov.in', 'eval.kavita@avsar.gov.in'], base: 8.6, rec: 'RECOMMEND' },
  { app: 5, evaluators: ['eval.rehana@avsar.gov.in', 'eval.prakash@avsar.gov.in'], base: 6.9, rec: 'RECOMMEND_WITH_CONDITIONS' },
  // Left unscored on purpose: this is the evaluator's live worklist in the demo.
  { app: 6, evaluators: ['eval.rehana@avsar.gov.in', 'eval.kavita@avsar.gov.in'], base: null, rec: null },
  { app: 7, evaluators: ['eval.prakash@avsar.gov.in', 'eval.sanjay@avsar.gov.in'], base: null, rec: null },
];

const remarksBank = {
  RECOMMEND: 'The approach is credible at the stated readiness level and the KPI mapping is explicit rather than aspirational. Cost is defensible against the outcome. Recommended for pilot.',
  RECOMMEND_WITH_CONDITIONS: 'Technically sound but the delivery schedule assumes department-side data access that has not been confirmed. Recommended subject to a data access agreement being executed before the pilot starts.',
  NOT_RECOMMEND: 'Localisation resolution as described does not meet the mean-time-to-detect target, and the proposal does not explain how a crew would act on an alert of this granularity. Not recommended for this problem statement.',
};

const critList = all('SELECT * FROM evaluation_criteria ORDER BY bucket DESC, id');

for (const c of committees) {
  c.evaluators.forEach((email, idx) => {
    if (c.base === null) {
      insert('evaluations', { application_id: appIds[c.app], evaluator_id: userIds[email], status: 'ASSIGNED', assigned_at: daysAgo(12) });
      return;
    }
    const scores = {};
    for (const cr of critList) {
      const jitter = ((c.app * 7 + idx * 3 + cr.id * 5) % 5) / 5 - 0.4;
      scores[cr.code] = Math.max(1, Math.min(10, Math.round((c.base + jitter) * 10) / 10));
    }
    const totals = computeTotal(scores, critList);
    insert('evaluations', {
      application_id: appIds[c.app],
      evaluator_id: userIds[email],
      scores: JSON.stringify(scores),
      total_score: totals.total,
      remarks: remarksBank[c.rec],
      recommendation: c.rec,
      coi_declared: 1,
      status: 'SUBMITTED',
      assigned_at: daysAgo(45),
      submitted_at: daysAgo(38 - idx),
    });
  });
}

/* -------------------------------------------------------------- pilots */

const pilotSpecs = [
  {
    app: 0, code: 'AVS/PL/2026/0001', dept: 'KA-BWSSB', monitor: null,
    title: 'AquaSense NRW reduction pilot - Zones 4 and 7',
    scope: 'Twenty-four acoustic loggers and virtual district metering across 148 km of distribution main serving approximately 62,000 connections, with alerts routed into the existing work-order system.',
    budget: 46 * L, start: daysAgo(200), end: daysAgo(20), status: 'CLOSED', verdict: 'SUCCESS',
    verdictNote: 'All three KPIs met or exceeded. Non-revenue water in the pilot zones fell from 34% to 13.8%. The board has approved extension to the remaining nine zones.',
    sanction: 'BWSSB/INNOV/2025/114',
    milestones: [
      ['Site survey, logger placement plan and baseline energy audit', 30, 'APPROVED'],
      ['Deployment across Zone 4 and first verified alert', 30, 'APPROVED'],
      ['Deployment across Zone 7 and correlation calibration', 20, 'APPROVED'],
      ['Closure report, handover and crew training', 20, 'APPROVED'],
    ],
    kpis: [
      ['nrw', 'Non-revenue water', 15, '%', [['2025-10', 33.4], ['2025-11', 29.1], ['2025-12', 24.6], ['2026-01', 19.2], ['2026-02', 15.9], ['2026-03', 13.8]]],
      ['mttd', 'Mean time to detect a burst', 24, 'hours', [['2025-10', 152], ['2025-11', 96], ['2025-12', 61], ['2026-01', 38], ['2026-02', 26], ['2026-03', 19]]],
      ['alerts', 'Verified leak alerts per month', 40, 'alerts', [['2025-10', 6], ['2025-11', 18], ['2025-12', 29], ['2026-01', 41], ['2026-02', 47], ['2026-03', 52]]],
    ],
  },
  {
    app: 2, code: 'AVS/PL/2026/0002', dept: 'MORTH-NH', monitor: null,
    title: 'RoadLens pavement survey pilot - 1,200 km corridor',
    scope: 'Quarterly automated distress survey of the full corridor at highway speed, with output written to the highway management system and validated against a 60 km expert-rated control section.',
    budget: 61 * L, start: daysAgo(96), end: daysAhead(56), status: 'ACTIVE', verdict: null, verdictNote: null,
    sanction: 'MORTH/NH-OPS/INNOV/2026/031',
    milestones: [
      ['Rig integration, calibration and control-section validation', 25, 'APPROVED'],
      ['First full corridor pass and HMS data handshake', 35, 'APPROVED'],
      ['Second quarterly pass with change detection', 25, 'SUBMITTED'],
      ['Closure report and operator handover', 15, 'PENDING'],
    ],
    kpis: [
      ['cycle', 'Survey cycle time', 14, 'days', [['2026-01', 31], ['2026-02', 19], ['2026-03', 12]]],
      ['accuracy', 'Agreement with expert manual rating', 90, '%', [['2026-01', 81], ['2026-02', 88], ['2026-03', 92]]],
      ['coverage', 'Corridor length covered per quarter', 1200, 'km', [['2026-01', 420], ['2026-02', 980], ['2026-03', 1200]]],
    ],
  },
];

const pilotIds = {};
for (const p of pilotSpecs) {
  const app = get('SELECT * FROM applications WHERE id = ?', [appIds[p.app]]);
  const ch = get('SELECT * FROM challenges WHERE id = ?', [app.challenge_id]);
  const monitor = get("SELECT id FROM users WHERE role = 'PILOT_MONITOR' AND dept_id = ?", [deptIds[p.dept]]);

  const pid = insert('pilots', {
    code: p.code,
    challenge_id: ch.id,
    application_id: app.id,
    startup_id: app.startup_id,
    dept_id: deptIds[p.dept],
    monitor_id: monitor?.id ?? null,
    title: p.title,
    scope: p.scope,
    start_date: p.start.slice(0, 10),
    end_date: p.end.slice(0, 10),
    budget_sanctioned: p.budget,
    sanction_order_no: p.sanction,
    kpi_targets: ch.success_kpis,
    ip_clause: 'STARTUP_RETAINS',
    dpa_signed: 1,
    sandbox_users: 62000,
    status: p.status,
    verdict: p.verdict,
    verdict_note: p.verdictNote,
    verdict_at: p.verdict ? daysAgo(18) : null,
    created_at: addDays(app.submitted_at, 21),
  });
  pilotIds[p.code] = pid;

  p.milestones.forEach(([title, pct, status], i) => {
    const amount = Math.round((p.budget * pct) / 100);
    const mid = insert('milestones', {
      pilot_id: pid,
      seq: i + 1,
      title,
      description: `Deliverable ${i + 1} of ${p.milestones.length} under sanction ${p.sanction}.`,
      due_date: addDays(p.start, 30 * (i + 1)).slice(0, 10),
      payout_percent: pct,
      payout_amount: amount,
      evidence_note: status === 'PENDING' ? null : 'Evidence pack uploaded: deployment photographs, verification log and signed field acceptance note.',
      status: status === 'APPROVED' ? 'PAID' : status,
      submitted_at: status === 'PENDING' ? null : addDays(p.start, 30 * (i + 1) - 3),
      approved_at: status === 'APPROVED' ? addDays(p.start, 30 * (i + 1) + 2) : null,
      approved_by: status === 'APPROVED' ? (monitor?.id ?? null) : null,
    });

    if (status === 'APPROVED') {
      insert('payments', {
        pilot_id: pid,
        milestone_id: mid,
        invoice_no: `${p.code.replace(/\//g, '-')}-M${i + 1}`,
        amount,
        raised_on: addDays(p.start, 30 * (i + 1) + 2).slice(0, 10),
        due_date: addDays(p.start, 30 * (i + 1) + 47).slice(0, 10),
        paid_on: addDays(p.start, 30 * (i + 1) + 29).slice(0, 10),
        pfms_ref: `PFMS/2026/${Math.floor(Math.random() * 900000 + 100000)}`,
        status: 'PAID',
      });
    }
  });

  for (const [key, label, target, unit, series] of p.kpis) {
    for (const [period, value] of series) {
      insert('kpi_readings', {
        pilot_id: pid, kpi_key: key, kpi_label: label, target_value: target,
        actual_value: value, unit, period, recorded_by: monitor?.id ?? null,
      });
    }
  }
}

/* --------------------------------------------------- procurement + catalogue */

const nrwPilot = get('SELECT * FROM pilots WHERE code = ?', ['AVS/PL/2026/0001']);
const procId = insert('procurements', {
  code: 'AVS/PR/2026/0001',
  pilot_id: nrwPilot.id,
  challenge_id: nrwPilot.challenge_id,
  startup_id: nrwPilot.startup_id,
  dept_id: nrwPilot.dept_id,
  mode: 'RATE_CONTRACT',
  gfr_rule: 'GFR 2017, Rule 145',
  justification: 'The pilot under sanction BWSSB/INNOV/2025/114 established that the solution reduces non-revenue water from 34% to 13.8% against a target of 15%, with mean time to detect falling from 152 hours to 19 hours. No other participant met the mean-time-to-detect target. A two-year rate contract is proposed so that the remaining nine zones, and any other urban water utility on the platform, can draw down at a discovered price without repeating the pilot.',
  contract_value: 4.1 * CR,
  contract_start: daysAgo(14).slice(0, 10),
  contract_end: daysAhead(716).slice(0, 10),
  po_number: 'PO/KA-BWSSB/2026/0001',
  status: 'ACTIVE',
  approved_by: userIds['head.bwssb@avsar.gov.in'],
  approved_at: daysAgo(16),
  created_at: daysAgo(18),
});

insert('payments', {
  procurement_id: procId,
  invoice_no: 'AVS-PR-2026-0001-INV1',
  amount: Math.round(4.1 * CR * 0.3),
  raised_on: daysAgo(12).slice(0, 10),
  due_date: daysAhead(33).slice(0, 10),
  status: 'DUE',
});

const catId = insert('catalogue', {
  code: 'AVS/CT/2026/0001',
  procurement_id: procId,
  startup_id: nrwPilot.startup_id,
  proven_dept_id: nrwPilot.dept_id,
  solution_name: 'AquaSense - non-revenue water detection and localisation',
  category: 'Environment & Water',
  description: 'Acoustic leak detection with virtual district metering for urban water distribution networks. Proven in two Bengaluru zones covering 148 km of main and 62,000 connections: non-revenue water reduced from 34% to 13.8%, mean time to detect a burst reduced from 152 hours to 19 hours. Priced per zone of up to 80 km of distribution main, inclusive of loggers, backhaul, analytics and first-year support.',
  unit_price: 41 * L,
  uom: 'per zone (up to 80 km of main) per year',
  proven_kpi: JSON.stringify([
    { kpi_key: 'nrw', kpi_label: 'Non-revenue water', target_value: 15, actual_value: 13.8, unit: '%' },
    { kpi_key: 'mttd', kpi_label: 'Mean time to detect a burst', target_value: 24, actual_value: 19, unit: 'hours' },
    { kpi_key: 'alerts', kpi_label: 'Verified leak alerts per month', target_value: 40, actual_value: 52, unit: 'alerts' },
  ]),
  rate_contract_valid_till: daysAhead(716).slice(0, 10),
  adoptions: 2,
  status: 'LISTED',
  created_at: daysAgo(10),
});

insert('adoptions', { catalogue_id: catId, dept_id: deptIds['MOHUA-SCM'], requested_by: userIds['nodal.scm@avsar.gov.in'], quantity: 3, value: 3 * 41 * L, status: 'PO_ISSUED', created_at: daysAgo(7) });
insert('adoptions', { catalogue_id: catId, dept_id: deptIds['MH-MSEDCL'], requested_by: userIds['nodal.msedcl@avsar.gov.in'], quantity: 1, value: 41 * L, status: 'APPROVED', created_at: daysAgo(3) });

/* ------------------------------------------------------------ grievance */

insert('grievances', {
  code: 'AVS/GR/2026/0001',
  raised_by: get('SELECT user_id FROM startups WHERE id = ?', [startupIds['Anantara']]).user_id,
  entity_type: 'applications',
  entity_id: appIds[10],
  category: 'ELIGIBILITY',
  description: 'Our application to the plot-level advisory problem statement was blocked at the eligibility gate on the technology readiness floor. Our TRL was assessed at 5 against a floor of 5, and we would like the gate result reviewed against the evidence filed with the application.',
  status: 'UNDER_REVIEW',
  sla_due: daysAhead(9).slice(0, 10),
  created_at: daysAgo(6),
});

/* --------------------------------------------------------- audit + notify */

record({ actorId: userIds['admin@avsar.gov.in'], actorRole: 'ADMIN', action: 'SYSTEM_SEEDED', entityType: 'system', meta: { dataset: 'demo-v1' } });
for (const id of chIds) {
  const c = get('SELECT * FROM challenges WHERE id = ?', [id]);
  record({ actorId: c.created_by, actorRole: 'NODAL_OFFICER', action: 'CHALLENGE_CREATED', entityType: 'challenges', entityId: id, meta: { title: c.title } });
  if (c.published_at) record({ actorId: c.approved_by ?? c.created_by, actorRole: 'DEPT_HEAD', action: 'CHALLENGE_PUBLISHED', entityType: 'challenges', entityId: id, meta: { code: c.code } });
}
for (const id of appIds) {
  const a = get('SELECT * FROM applications WHERE id = ?', [id]);
  const s = get('SELECT user_id FROM startups WHERE id = ?', [a.startup_id]);
  record({ actorId: s.user_id, actorRole: 'STARTUP', action: 'APPLICATION_SUBMITTED', entityType: 'applications', entityId: id, meta: { code: a.code } });
}
for (const code of Object.keys(pilotIds)) {
  record({ actorRole: 'NODAL_OFFICER', action: 'PILOT_CREATED', entityType: 'pilots', entityId: pilotIds[code], meta: { code } });
}
record({ actorId: userIds['head.bwssb@avsar.gov.in'], actorRole: 'DEPT_HEAD', action: 'PROCUREMENT_APPROVED', entityType: 'procurements', entityId: procId, meta: { code: 'AVS/PR/2026/0001' } });

insert('notifications', { user_id: get('SELECT user_id FROM startups WHERE id = ?', [startupIds['SetuRoad']]).user_id, title: 'Milestone 3 evidence received', body: 'The department is reviewing your submission for AVS/PL/2026/0002.', link: '/app/pilots', severity: 'INFO' });
insert('notifications', { user_id: userIds['nodal.nh@avsar.gov.in'], title: 'Milestone awaiting review', body: 'AVS/PL/2026/0002 milestone 3 has been submitted for acceptance.', link: '/app/pilots', severity: 'WARNING' });
insert('notifications', { user_id: userIds['head.scm@avsar.gov.in'], title: 'Problem statement awaiting approval', body: 'Solid waste route compliance is pending your approval to publish.', link: '/app/challenges', severity: 'WARNING' });
insert('notifications', { user_id: userIds['eval.rehana@avsar.gov.in'], title: 'Two evaluations pending', body: 'Applications on the clinical documentation problem statement are awaiting your score.', link: '/app/evaluations', severity: 'INFO' });

/* ------------------------------------------------------------- summary */

const counts = {
  departments: countOf('departments'), users: countOf('users'), startups: countOf('startups'),
  challenges: countOf('challenges'), applications: countOf('applications'), evaluations: countOf('evaluations'),
  pilots: countOf('pilots'), milestones: countOf('milestones'), kpiReadings: countOf('kpi_readings'),
  procurements: countOf('procurements'), catalogue: countOf('catalogue'), adoptions: countOf('adoptions'),
  payments: countOf('payments'), auditLog: countOf('audit_log'),
};

console.log('\nAVSAR demo database seeded.\n');
console.table(counts);
console.log(`\nEvery account uses the password: ${PASSWORD}\n`);
console.table([
  { Role: 'Startup (JalSarthi)', Email: 'founder@jalsarthi.in' },
  { Role: 'Startup (SetuRoad)', Email: 'founder@seturoad.in' },
  { Role: 'Nodal Officer', Email: 'nodal.bwssb@avsar.gov.in' },
  { Role: 'Department Head', Email: 'head.bwssb@avsar.gov.in' },
  { Role: 'Evaluator', Email: 'eval.rehana@avsar.gov.in' },
  { Role: 'Pilot Monitor', Email: 'monitor.scm@avsar.gov.in' },
  { Role: 'Procurement Officer', Email: 'proc.scm@avsar.gov.in' },
  { Role: 'Platform Admin', Email: 'admin@avsar.gov.in' },
]);

/* ----------------------------------------------------------------- utils */

function reset() {
  const tables = ['audit_log', 'notifications', 'grievances', 'adoptions', 'catalogue', 'payments', 'procurements',
    'kpi_readings', 'milestones', 'pilots', 'evaluations', 'evaluation_criteria', 'applications', 'challenges',
    'startups', 'users', 'departments'];
  db.exec('PRAGMA foreign_keys = OFF');
  for (const t of tables) run(`DELETE FROM ${t}`);
  run("DELETE FROM sqlite_sequence WHERE name IN (" + tables.map(() => '?').join(',') + ')', tables);
  db.exec('PRAGMA foreign_keys = ON');
}

function countOf(table) { return Number(get(`SELECT COUNT(*) AS c FROM ${table}`).c); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function daysAhead(n) { return daysAgo(-n); }
function addDays(iso, n) { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString(); }
